/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { GqlRequestService } from '../gql-request/gql-request.service';

type Row = {
  sku?: string;
  volume?: string;
  value?: string;
};

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);
  constructor(private readonly gqlRequestService: GqlRequestService) {}

  async updateVariant(id: number, file: Express.Multer.File) {
    const rows = this.parseXlsx(file);
    console.log('rows ===>', rows);

    const result = {
      total: rows.length,
      updated: 0,
      skipped: 0,
      notFound: [] as string[],
      errors: [] as { sku: string; error: string }[],
    };

    for (const row of rows) {
      const sku = String(row.sku ?? '').trim();
      const volume = String(row.volume ?? row.value ?? '').trim();

      if (!sku || !volume) {
        result.skipped++;
        continue;
      }

      try {
        const variant = await this.findVariantBySku(id, sku);

        if (!variant) {
          result.notFound.push(sku);
          continue;
        }

        await this.updateVariantOptionValue({
          id,
          productId: variant.product.id,
          variantId: variant.id,
          volume,
        });

        result.updated++;

        this.logger.log(
          `Variant option updated | SKU: ${sku} | Product: ${variant.product.title} | Volume: ${volume}`,
        );
      } catch (error) {
        result.errors.push({
          sku,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  private parseXlsx(file: Express.Multer.File): Row[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    return rows.map((row) => ({
      sku: row.sku ?? row.SKU ?? row['Variant SKU'],
      volume: row.volume ?? row.Volume ?? row.value ?? row.Value,
    }));
  }

  private async findVariantBySku(id: number, sku: string) {
    const query = `
      query FindVariantBySku($query: String!) {
        productVariants(first: 1, query: $query) {
          nodes {
            id
            sku
            selectedOptions {
              name
              value
            }
            product {
              id
              title
            }
          }
        }
      }
    `;

    const data = await this.gqlRequestService.gqlRequest<{
      productVariants: {
        nodes: {
          id: string;
          sku: string;
          selectedOptions: { name: string; value: string }[];
          product: {
            id: string;
            title: string;
          };
        }[];
      };
    }>(query, id, {
      query: `sku:${sku}`,
    });

    return data.productVariants.nodes.find((v) => v.sku === sku) ?? null;
  }

  private async updateVariantOptionValue(params: {
    id: number;
    productId: string;
    variantId: string;
    volume: string;
  }) {
    const mutation = `
      mutation UpdateVariantOptionValue(
        $productId: ID!,
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(
          productId: $productId,
          variants: $variants
        ) {
          product {
            id
            title
          }
          productVariants {
            id
            sku
            selectedOptions {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.gqlRequestService.gqlRequest<{
      productVariantsBulkUpdate: {
        userErrors: { field: string[]; message: string }[];
      };
    }>(mutation, params.id, {
      productId: params.productId,
      variants: [
        {
          id: params.variantId,
          optionValues: [
            {
              optionName: 'Volume',
              name: params.volume,
            },
          ],
        },
      ],
    });

    const errors = data.productVariantsBulkUpdate.userErrors;

    if (errors.length) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
  }
}
