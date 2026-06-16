/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { Parser } from 'json2csv';
import * as path from 'path';
import sharp from 'sharp';
import * as XLSX from 'xlsx';
import { ParsedProduct, XlsxRow } from '../../types/types';
import {
  extractFirstImageFromHtml,
  formatTags,
  isValidImageBuffer,
  normalizeImageUrl,
  normalizeUrls,
  slugify,
  toHtml,
  toRichTextList,
  toRichTextOrderedList,
  toRichTextParagraphs,
} from '../../utils/helpers';
import { BunnyService } from '../bunny/bunny.service';

@Injectable()
export class ParseXlsxService {
  constructor(private readonly bunny: BunnyService) {}

  async uploadFile(file: Express.Multer.File) {
    const products = this.parseXlsx(file);
    const csv = await this.buildShopifyCsv(products);

    const fileName = `shopify-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, csv, 'utf8');

    return { message: 'CSV file created', filePath };
  }

  parseXlsx(file: Express.Multer.File): ParsedProduct[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<XlsxRow>(sheet);

    const products: ParsedProduct[] = [];
    let current: ParsedProduct | null = null;

    for (const row of rows) {
      const hasTitle = !!row.title;

      if (hasTitle) {
        if (current) products.push(current);

        const longDesc = row['long description (metafield)'];
        const composition = row['composition (metafield)'];
        const application = row['application (metafield)'];

        current = {
          handle: slugify(row.title!),
          title: row.title!.trim(),
          brand: row.brand?.trim() ?? '',
          type: row.type?.trim() ?? '',
          category: row.category?.trim() ?? '',
          tags: formatTags(row.tag, row.category),
          bodyHtml: toHtml(row.description),
          country: row['country (metafield)']?.trim() ?? '',
          url: row.url ?? '',
          variants: [
            ...(row.price
              ? [
                  {
                    sku: String(row.sku ?? '').trim(),
                    price: Number(row.price),
                    volume: row.volume?.trim() ?? '',
                  },
                ]
              : []),
          ],

          ...(longDesc
            ? { metaLongDescription: toRichTextParagraphs(longDesc) }
            : {}),
          ...(composition
            ? { metaComposition: toRichTextList(composition, 'unordered') }
            : {}),
          ...(application
            ? { metaApplication: toRichTextOrderedList(application) }
            : {}),
        };
      } else if (current && row.sku && row.price) {
        current.variants.push({
          sku: String(row.sku).trim(),
          price: Number(row.price),
          volume: row.volume?.trim() ?? '',
        });
      }
    }

    if (current) products.push(current);

    return products;
  }

  private async buildShopifyCsv(products: ParsedProduct[]) {
    const rows: Record<string, string | number>[] = [];

    for (const product of products) {
      const images: string[] = await this.prepareProductImageUrls(product);

      product.variants.forEach((variant, idx) => {
        rows.push({
          Handle: product.handle,
          Title: idx === 0 ? product.title : '',
          'Body (HTML)': idx === 0 ? product.bodyHtml : '',
          Vendor: idx === 0 ? product.brand : '',
          Type: idx === 0 ? product.type : '',
          Tags: idx === 0 ? product.tags : '',
          Published: idx === 0 ? 'true' : '',
          'Option1 Name': idx === 0 ? 'Volume' : '',
          'Option1 Value': variant.volume,
          'Variant SKU': variant.sku,
          'Variant Price': variant.price,
          'Variant Inventory Qty': 100,
          'Variant Inventory Tracker': 'shopify',
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Requires Shipping': 'true',
          'Variant Taxable': 'true',
          'Country of origin (product.metafields.custom.country_of_origin)':
            idx === 0 ? product.country : '',
          Status: idx === 0 ? 'active' : '',

          'Image Src': idx === 0 ? images[0] || '' : '',
          'Image Position': idx === 0 && images[0] ? 1 : '',
        });
      });

      images.slice(1).forEach((url, imageIdx) => {
        rows.push({
          Handle: product.handle,
          Title: '',
          'Body (HTML)': '',
          Vendor: '',
          Type: '',
          Tags: '',
          Published: '',
          'Option1 Name': '',
          'Option1 Value': '',
          'Variant SKU': '',
          'Variant Price': '',
          'Variant Inventory Qty': '',
          'Variant Inventory Tracker': '',
          'Variant Inventory Policy': '',
          'Variant Fulfillment Service': '',
          'Variant Requires Shipping': '',
          'Variant Taxable': '',
          'Country of origin (product.metafields.custom.country_of_origin)': '',
          Status: '',
          'Image Src': url,
          'Image Position': imageIdx + 2,
        });
      });
    }

    const fields = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Type',
      'Tags',
      'Published',
      'Option1 Name',
      'Option1 Value',
      'Variant SKU',
      'Variant Price',
      'Variant Inventory Qty',
      'Variant Inventory Tracker',
      'Variant Inventory Policy',
      'Variant Fulfillment Service',
      'Variant Requires Shipping',
      'Variant Taxable',
      'Country of origin (product.metafields.custom.country_of_origin)',
      'Status',
      'Image Src',
      'Image Position',
    ];

    const parser = new Parser({
      fields,
      withBOM: true,
    });

    return parser.parse(rows);
  }

  private async prepareProductImageUrls(product: ParsedProduct) {
    const urls = normalizeUrls(product.url);

    const uploadedUrls: string[] = [];

    for (const url of urls) {
      const imageBuffer = await this.downloadImage(url);

      if (!imageBuffer) {
        continue;
      }

      const optimizedBuffer = await sharp(imageBuffer)
        .resize({
          width: 1200,
          height: 1800,
          fit: 'cover',
        })
        .webp({
          quality: 90,
        })
        .toBuffer();

      const now = new Date();
      const totalMs = now.getTime();

      const fileName = `${product.handle}-${totalMs}.webp`;
      const path = `shopify/image/${fileName}`;

      await this.bunny.upload(path, optimizedBuffer);

      uploadedUrls.push(`https://stikers.b-cdn.net/${path}`);
    }

    return uploadedUrls;
  }

  private async downloadImage(url: string): Promise<Buffer | null> {
    const normalizedUrl = normalizeImageUrl(url);

    if (!normalizedUrl) {
      return null;
    }

    const res = await fetch(normalizedUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${normalizedUrl}`);
    }

    const contentType = res.headers.get('content-type') || '';

    const buffer = Buffer.from(await res.arrayBuffer());

    if (await isValidImageBuffer(buffer)) {
      return buffer;
    }

    if (contentType.includes('text/html')) {
      const html = buffer.toString('utf8');

      const imageUrl = extractFirstImageFromHtml(html, res.url);

      if (!imageUrl) {
        throw new Error(`No image found on page: ${normalizedUrl}`);
      }

      return this.downloadImage(imageUrl);
    }

    throw new Error(
      `Downloaded file is not image: ${contentType} ${normalizedUrl}`,
    );
  }
}
