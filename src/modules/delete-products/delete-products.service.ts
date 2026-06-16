/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { sleep } from '@/src/utils/helpers';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GqlRequestService } from '../gql-request/gql-request.service';

@Injectable()
export class DeleteProductsService {
  constructor(private readonly gqlRequestService: GqlRequestService) {}

  async deleteProducts(
    id: string,
  ): Promise<{ success: boolean; result: string }> {
    await this.runBulkQuery(id);
    const fileUrl = await this.pollBulkOperation('QUERY', id);

    const productIds = await this.downloadIds(fileUrl);

    if (productIds.length === 0) {
      return { success: true, result: 'No products found' };
    }

    const lines = productIds.map((id) => JSON.stringify({ input: { id } }));
    const jsonlBuffer = Buffer.from(lines.join('\n'), 'utf-8');

    const { url, resourceUrl, headers } = await this.stagedUpload(
      jsonlBuffer,
      id,
    );
    await axios.put(url, jsonlBuffer, { headers });
    await this.runBulkDeleteMutation(resourceUrl, id);
    await this.pollBulkOperation('MUTATION', id);

    return { success: true, result: `Deleted ${productIds.length} products` };
  }

  private async runBulkQuery(id: string): Promise<void> {
    const mutation = `
				mutation {
					bulkOperationRunQuery(
						query: """
							{
								products {
									edges {
										node {
											id
										}
									}
								}
							}
						"""
					) {
						bulkOperation { id status }
						userErrors { field message }
					}
				}
			`;

    const data = await this.gqlRequestService.gqlRequest<{
      bulkOperationRunQuery: {
        bulkOperation: { id: string; status: string };
        userErrors: { field: string; message: string }[];
      };
    }>(mutation, id);

    const errors = data.bulkOperationRunQuery.userErrors;
    if (errors.length)
      throw new Error(`Bulk query error: ${JSON.stringify(errors)}`);
  }

  private async stagedUpload(
    buffer: Buffer,
    id: string,
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
          filename: `delete-products-${Date.now()}.jsonl`,
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

  private async runBulkDeleteMutation(
    stagedUploadPath: string,
    id: string,
  ): Promise<void> {
    const mutation = `
				mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
					bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
						bulkOperation { id status }
						userErrors { field message }
					}
				}
			`;

    const innerMutation = `
				mutation deleteProduct($input: ProductDeleteInput!) {
					productDelete(input: $input) {
						deletedProductId
						userErrors { field message }
					}
				}
			`;

    const data = await this.gqlRequestService.gqlRequest<{
      bulkOperationRunMutation: {
        bulkOperation: { id: string; status: string };
        userErrors: { field: string; message: string }[];
      };
    }>(mutation, id, { mutation: innerMutation, stagedUploadPath });

    const errors = data.bulkOperationRunMutation.userErrors;
    if (errors.length)
      throw new Error(`Bulk delete error: ${JSON.stringify(errors)}`);
  }

  private async pollBulkOperation(
    type: 'QUERY' | 'MUTATION',
    id: string,
  ): Promise<string> {
    const query = `
				query {
					currentBulkOperation(type: ${type}) {
						id status errorCode url objectCount
					}
				}
			`;

    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(5000);

      const data = await this.gqlRequestService.gqlRequest<{
        currentBulkOperation: {
          status: string;
          errorCode: string | null;
          url: string | null;
          objectCount: number;
        };
      }>(query, id);

      const op = data.currentBulkOperation;

      if (op.status === 'COMPLETED') {
        return op.url ?? `Completed: ${op.objectCount} objects`;
      }

      if (op.status === 'FAILED') {
        throw new Error(`Bulk ${type} failed: ${op.errorCode ?? 'unknown'}`);
      }
    }

    throw new Error(`Bulk ${type} timeout (5 min)`);
  }

  private async downloadIds(fileUrl: string): Promise<string[]> {
    const res = await axios.get<string>(fileUrl, { responseType: 'text' });

    return res.data
      .split('\n')
      .filter(Boolean)
      .map((line) => (JSON.parse(line) as { id: string }).id)
      .filter(Boolean);
  }
}
