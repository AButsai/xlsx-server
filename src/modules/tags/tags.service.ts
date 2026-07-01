/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

type XlsxRow = {
  title?: string;
  brand?: string;
  type?: string;
  category?: string;
  tag?: string;
  Best?: string;
  New?: string;
  sku?: string | number;
  price?: string | number;
  volume?: string;
  [key: string]: any;
};

type ShopifyVariantNode = {
  id: string;
  sku: string;
  product: {
    id: string;
    title: string;
  };
};

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);
  private readonly shopDomain = process.env.SHOPIFY_STORE!;
  private readonly accessToken = process.env.SHOPIFY_TOKEN!;
  private readonly apiVersion = process.env.SHOPIFY_API_VERSION || '2025-07';

  async updateTags(file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required');
    }

    // 1. Парсим Excel файл твоим методом и строим карту SKU -> Tags
    const skuTagsMap = this.buildSkuTagsMapFromXlsx(file);

    const result = {
      totalSku: skuTagsMap.size,
      updated: 0,
      notFound: [] as string[],
      errors: [] as { sku: string; error: string }[],
      log: [] as {
        sku: string;
        productId: string | null;
        isUpdate: boolean;
        status: string;
      }[],
    };

    // 2. Обновляем теги в Shopify
    for (const [sku, newTags] of skuTagsMap.entries()) {
      try {
        const variant = await this.findVariantBySku(sku);

        if (!variant) {
          this.logger.warn(`SKU not found: ${sku}`);
          result.notFound.push(sku);
          result.log.push({
            sku,
            productId: null,
            isUpdate: false,
            status: 'NOT_FOUND',
          });
          continue;
        }

        const productId = variant.product.id;
        await this.addProductTags(productId, newTags);

        result.updated++;
        result.log.push({ sku, productId, isUpdate: true, status: 'SUCCESS' });
        this.logger.log(
          `Successfully updated tags for SKU: ${sku} (Product ID: ${productId})`,
        );

        await this.sleep(150);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to update tags for SKU: ${sku}`,
          errorMessage,
        );

        result.errors.push({ sku, error: errorMessage });
        result.log.push({
          sku,
          productId: null,
          isUpdate: false,
          status: `ERROR: ${errorMessage}`,
        });
      }
    }

    return result;
  }

  private buildSkuTagsMapFromXlsx(
    file: Express.Multer.File,
  ): Map<string, string[]> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<XlsxRow>(sheet);

    const skuTagsMap = new Map<string, string[]>();

    let currentProductTags: string[] = [];

    for (const row of rows) {
      const hasTitle = !!row.title;

      if (hasTitle) {
        currentProductTags = this.formatTags(
          row.tag,
          row.category,
          row.type,
          row.Best,
          row.New,
        );

        if (row.sku) {
          this.addSkuToMap(skuTagsMap, row.sku, currentProductTags);
        }
      } else if (row.sku) {
        this.addSkuToMap(skuTagsMap, row.sku, currentProductTags);
      }
    }

    return skuTagsMap;
  }

  private addSkuToMap(
    map: Map<string, string[]>,
    rawSku: string | number,
    tags: string[],
  ) {
    const sku = String(rawSku ?? '')
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!sku || tags.length === 0) return;

    if (!map.has(sku)) {
      map.set(sku, []);
    }

    map.set(sku, this.mergeTags(map.get(sku)!, tags));
  }

  private formatTags(...fields: (string | undefined)[]): string[] {
    return fields
      .filter(Boolean)
      .flatMap((field) => String(field).split(','))
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private mergeTags(oldTags: string[], newTags: string[]): string[] {
    const set = new Set<string>();
    const result: string[] = [];

    for (const tag of [...oldTags, ...newTags]) {
      const normalized = tag.trim().toLowerCase();
      if (!normalized || set.has(normalized)) continue;

      set.add(normalized);
      result.push(tag.trim());
    }
    return result;
  }

  private async findVariantBySku(
    sku: string,
  ): Promise<ShopifyVariantNode | null> {
    const cleanedSku = sku.trim().replace(/^['"]|['"]$/g, '');
    const query = `
      query FindVariantBySku($query: String!) {
        productVariants(first: 1, query: $query) {
          nodes {
            id
            sku
            product {
              id
              title
            }
          }
        }
      }
    `;

    const data = await this.shopifyGraphql(query, {
      query: `sku:${cleanedSku}`,
    });
    const variants = data.productVariants.nodes as ShopifyVariantNode[];
    return variants.find((variant) => variant.sku === cleanedSku) || null;
  }

  private async addProductTags(productId: string, tags: string[]) {
    const mutation = `
      mutation AddProductTags($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
      }
    `;

    const data = await this.shopifyGraphql(mutation, { id: productId, tags });
    const errors = data.tagsAdd.userErrors;
    if (errors?.length) {
      throw new Error(errors.map((error) => error.message).join(', '));
    }
    return data.tagsAdd.node;
  }

  private async shopifyGraphql(query: string, variables?: Record<string, any>) {
    const response = await fetch(
      `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
    );

    const json = await response.json();
    if (!response.ok || json.errors) {
      throw new Error(JSON.stringify(json.errors || json));
    }
    return json.data;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
