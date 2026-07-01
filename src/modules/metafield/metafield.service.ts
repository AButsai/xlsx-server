import { ParsedProduct, XlsxRow } from '@/src/shared/types/types';
import { sleep } from '@/src/shared/utils/helpers';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { GenerateCsvService } from '../generate-csv/generate-csv.service';
import { GqlRequestService } from '../gql-request/gql-request.service';

@Injectable()
export class MetafieldService {
  constructor(
    private readonly generateCsvService: GenerateCsvService,
    private readonly gqlRequestService: GqlRequestService,
  ) {}

  async updateMetafield(id: number, file: Express.Multer.File) {
    const products = this.generateCsvService.parseXlsx(file);

    const withMeta = products.filter(
      (p) => p.metaLongDescription || p.metaComposition || p.metaApplication,
    );

    if (withMeta.length === 0) {
      return { success: true, result: 'No metafields to upload' };
    }

    const handles = withMeta.map((p) => p.handle);
    const gidMap = await this.resolveHandlesToGids(handles, id);

    const lines = this.buildMetafieldJsonl(withMeta, gidMap);

    if (lines.length === 0) {
      return { success: true, result: 'No matching products found in Shopify' };
    }

    const jsonlBuffer = Buffer.from(lines.join('\n'), 'utf-8');

    const { url, resourceUrl, headers } = await this.stagedUpload(
      jsonlBuffer,
      id,
    );

    await axios.put(url, jsonlBuffer, { headers });

    await this.runBulkMutation(resourceUrl, id);

    const result = await this.pollBulkOperation(id);

    return { success: true, result };
  }

  private async resolveHandlesToGids(
    handles: string[],
    id: number,
  ): Promise<Record<string, string>> {
    const BATCH = 50;
    const result: Record<string, string> = {};

    for (let i = 0; i < handles.length; i += BATCH) {
      const batch = handles.slice(i, i + BATCH);

      const query = `
					query {
						${batch
              .map(
                (h, idx) => `
							p${idx}: productByHandle(handle: "${h}") {
								id
								handle
							}
						`,
              )
              .join('\n')}
					}
				`;

      const res = await this.gqlRequestService.gqlRequest<
        Record<string, { id: string; handle: string } | null>
      >(query, id);

      for (const val of Object.values(res)) {
        if (val) result[val.handle] = val.id;
      }

      if (i + BATCH < handles.length) await sleep(500);
    }

    return result;
  }

  private buildMetafieldJsonl(
    products: ParsedProduct[],
    gidMap: Record<string, string>,
  ): string[] {
    const lines: string[] = [];

    const metaEntries = [
      { key: 'long_description', field: 'metaLongDescription' as const },
      { key: 'composition', field: 'metaComposition' as const },
      { key: 'method_of_application', field: 'metaApplication' as const },
    ];

    for (const product of products) {
      const ownerId = gidMap[product.handle];
      if (!ownerId) {
        continue;
      }

      for (const { key, field } of metaEntries) {
        const value = product[field];
        console.log('value ===>', value);
        if (!value) continue;

        lines.push(
          JSON.stringify({
            metafields: [
              {
                ownerId,
                namespace: 'custom',
                key,
                type: 'rich_text_field',
                value: JSON.stringify(value),
              },
            ],
          }),
        );
      }
    }

    return lines;
  }

  private async stagedUpload(
    buffer: Buffer,
    id: number,
  ): Promise<{
    url: string;
    resourceUrl: string;
    headers: Record<string, string>;
  }> {
    const mutation = `
				mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
					stagedUploadsCreate(input: $input) {
						stagedTargets {
							url
							resourceUrl
							parameters { name value }
						}
						userErrors { field message }
					}
				}
			`;

    const data = await this.gqlRequestService.gqlRequest<{
      stagedUploadsCreate: {
        stagedTargets: {
          url: string;
          resourceUrl: string;
          parameters: { name: string; value: string }[];
        }[];
        userErrors: { field: string; message: string }[];
      };
    }>(mutation, id, {
      input: [
        {
          resource: 'BULK_MUTATION_VARIABLES',
          filename: `metafields-${Date.now()}.jsonl`,
          mimeType: 'text/jsonl',
          httpMethod: 'PUT',
          fileSize: String(buffer.byteLength),
        },
      ],
    });

    const errors = data.stagedUploadsCreate.userErrors;
    if (errors.length)
      throw new Error(`Staged upload error: ${JSON.stringify(errors)}`);

    const target = data.stagedUploadsCreate.stagedTargets[0];
    const headers: Record<string, string> = {};
    for (const p of target.parameters) headers[p.name] = p.value;

    return { url: target.url, resourceUrl: target.resourceUrl, headers };
  }

  private async runBulkMutation(
    stagedUploadPath: string,
    id: number,
  ): Promise<string> {
    const mutation = `
				mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
					bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
						bulkOperation { id status }
						userErrors { field message }
					}
				}
			`;

    const innerMutation = `
		mutation($metafields: [MetafieldsSetInput!]!) {
			metafieldsSet(metafields: $metafields) {
				metafields { id key namespace value }
				userErrors { field message }
			}
		}
	`;

    const data = await this.gqlRequestService.gqlRequest<{
      bulkOperationRunMutation: {
        bulkOperation: { id: string; status: string };
        userErrors: { field: string; message: string }[];
      };
    }>(mutation, id, {
      mutation: innerMutation,
      stagedUploadPath,
    });

    const errors = data.bulkOperationRunMutation.userErrors;
    if (errors.length)
      throw new Error(`Bulk mutation error: ${JSON.stringify(errors)}`);

    return data.bulkOperationRunMutation.bulkOperation.id;
  }

  private async pollBulkOperation(id: number): Promise<string> {
    const query = `
				query {
					currentBulkOperation(type: MUTATION) {
						id status errorCode objectCount url
					}
				}
			`;

    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(5000);

      const data = await this.gqlRequestService.gqlRequest<{
        currentBulkOperation: {
          id: string;
          status: string;
          errorCode: string | null;
          objectCount: number;
        };
      }>(query, id);

      if (!data.currentBulkOperation) continue;

      const op = data.currentBulkOperation;

      if (op.status === 'COMPLETED') {
        return `Completed: ${op.objectCount} metafields uploaded`;
      }

      if (op.status === 'FAILED') {
        throw new Error(`Bulk operation failed: ${op.errorCode ?? 'unknown'}`);
      }
    }

    throw new Error('Bulk operation timeout (5 min)');
  }

  private parseXlsx(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<XlsxRow>(sheet);

    const products = [];

    // for (const row of rows) {
    // }

    return products;
  }
}
