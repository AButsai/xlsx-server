export interface XlsxRow {
  policy?: string;
  title?: string;
  sku?: string;
  'Status Shopify'?: string;
  price?: number;
  type?: string;
  category?: string;
  tag?: string;
  brand?: string;
  volume?: string;
  description?: string;
  'long description (metafield)'?: string;
  'composition (metafield)'?: string;
  'application (metafield)'?: string;
  'country (metafield)'?: string;
  url?: string;
  Best?: string;
  New?: string;
  [key: string]: any;
}

export interface ProductVariant {
  sku: string;
  price: number;
  volume: string;
}

export interface ParsedProduct {
  handle: string;
  title: string;
  brand: string;
  type: string;
  category: string;
  tags: string;
  bodyHtml: string;
  country: string;
  variants: ProductVariant[];
  url: string;
  metaLongDescription?: RichTextRoot;
  metaComposition?: RichTextRoot | string;
  metaApplication?: RichTextRoot | string;
}

export interface RichTextText {
  type: 'text';
  value: string;
}
export interface RichTextParagraph {
  type: 'paragraph';
  children: RichTextText[];
}
export interface RichTextListItem {
  type: 'list-item';
  children: RichTextParagraph[];
}
export interface RichTextList {
  type: 'list';
  listType: 'ordered' | 'unordered';
  children: RichTextListItem[];
}
export interface RichTextRoot {
  type: 'root';
  children: (RichTextParagraph | RichTextList)[];
}
