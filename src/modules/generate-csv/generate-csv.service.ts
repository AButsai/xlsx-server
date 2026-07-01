/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaService } from '@/src/prisma.service';
import { ETypeFile } from '@/src/shared/enums/file.type.enum';
import { ParsedProduct, XlsxRow } from '@/src/shared/types/types';
import { formatFileSize } from '@/src/shared/utils/file.size';
import { normalizeFilename } from '@/src/shared/utils/normalize.filename';
import { Injectable, NotAcceptableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Parser } from 'json2csv';
import sharp from 'sharp';
import * as XLSX from 'xlsx';
import {
  extractFirstImageFromHtml,
  formatTags,
  isValidImageBuffer,
  normalizeImageUrl,
  normalizeUrls,
  slugify,
  toHtml,
  toRichTextParagraphs,
  toRichTextText,
} from '../../shared/utils/helpers';
import { BunnyService } from '../bunny/bunny.service';

@Injectable()
export class GenerateCsvService {
  private PUBLIC_BUNNY_URL: string | undefined;
  constructor(
    private readonly bunny: BunnyService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.PUBLIC_BUNNY_URL =
      this.configService.get<string | undefined>('PUBLIC_BUNNY_URL') ||
      undefined;
  }

  async uploadFile(
    storeId: number | undefined,
    id: number | undefined,
    file: Express.Multer.File,
    title: string,
  ) {
    if (!id) throw new NotAcceptableException('USER_ID_NOT_FOUND');
    const user = await this.prisma.user.findUnique({ where: { id } });

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!user) throw new NotAcceptableException('USER_NOT_FOUND');

    const products = this.parseXlsx(file);
    const csv = await this.buildShopifyCsv(products);

    const buffer = Buffer.from(csv, 'utf-8');

    const fileSize = buffer.length;

    const size = formatFileSize(fileSize);

    const fileName = store
      ? `${normalizeFilename(store.title)}_${user.id}_${Date.now()}`
      : `${normalizeFilename(title)}_${user.id}_${Date.now()}`;
    const path = `files/${user.id}/csv/${fileName}.csv`;

    await this.bunny.upload(path, buffer);

    await this.prisma.file.create({
      data: {
        title: `${fileName}`,
        storeId: store ? store.id : null,
        fileUrl: path,
        userId: user.id,
        type: ETypeFile.CSV,
        size,
      },
    });

    await this.prisma.historyConvert.create({
      data: {
        storeId: store ? store.id : null,
        userId: user.id,
        size,
        titleCsv: fileName,
        titleXlsx: file.originalname,
        fileUrl: path,
      },
    });

    return `${this.PUBLIC_BUNNY_URL}/${path}`;
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

        const tags = formatTags(
          row.tag,
          row.category,
          row.type,
          row.Best,
          row.New,
        );

        current = {
          handle: slugify(row.title!),
          title: row.title!.trim(),
          brand: row.brand?.trim() ?? '',
          type: row.type?.trim() ?? '',
          category: row.category?.trim() ?? '',
          tags,
          bodyHtml: toHtml(row.description),
          country: row['country (metafield)']?.trim() ?? '',
          url: row.url ?? '',
          variants: [
            ...(row.price
              ? [
                  {
                    sku: String(row.sku ?? '').trim(),
                    price: Number(row.price),
                    volume: row.volume ?? '',
                  },
                ]
              : []),
          ],

          ...(longDesc
            ? { metaLongDescription: toRichTextParagraphs(longDesc) }
            : {}),
          ...(composition
            ? { metaComposition: toRichTextText(composition) }
            : {}),
          ...(application
            ? { metaApplication: toRichTextText(application) }
            : {}),
        };
      } else if (current && row.sku && row.price) {
        current.variants.push({
          sku: String(row.sku).trim(),
          price: Number(row.price),
          volume: row.volume ?? '',
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
        const volume = String(variant.volume ?? '').trim();
        const hasVolume = Boolean(volume);
        rows.push({
          Handle: product.handle,
          Title: idx === 0 ? product.title : '',
          'Body (HTML)': idx === 0 ? product.bodyHtml : '',
          Vendor: idx === 0 ? product.brand : '',
          Type: idx === 0 ? product.type : '',
          Tags: idx === 0 ? product.tags : '',
          Published: idx === 0 ? 'true' : '',

          'Option1 Name': hasVolume ? 'Volume' : '',
          'Option1 Value': hasVolume ? volume : '',

          'Variant SKU': variant.sku,
          'Variant Price': variant.price,
          'Variant Inventory Qty': 10,
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

      uploadedUrls.push(`${this.PUBLIC_BUNNY_URL}/${path}`);
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
