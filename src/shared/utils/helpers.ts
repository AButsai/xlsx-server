import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { RichTextParagraph, RichTextRoot } from '../types/types';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const normalizeImageUrl = (url: string) => {
  const cleanUrl = url.trim();

  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (driveMatch?.[1]) {
    return `https://drive.usercontent.google.com/download?id=${driveMatch[1]}&export=download`;
  }

  if (cleanUrl.includes('dropbox.com') && cleanUrl.includes('/scl/fo/')) {
    return null;
  }

  if (cleanUrl.includes('dropbox.com')) {
    return normalizeDropboxUrl(cleanUrl);
  }

  return cleanUrl;
};

export const normalizeDropboxUrl = (url: string) => {
  const parsed = new URL(url);

  if (
    parsed.pathname.includes('/scl/fo/') &&
    parsed.searchParams.has('preview')
  ) {
    return '';
  }

  const fileRegex = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

  if (fileRegex.test(parsed.pathname)) {
    parsed.searchParams.delete('raw');
    parsed.searchParams.set('dl', '1');

    return parsed.toString();
  }

  return '';
};

export const isValidImageBuffer = async (buffer: Buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();

    return Boolean(metadata.format && metadata.width && metadata.height);
  } catch {
    return false;
  }
};

export const extractFirstImageFromHtml = (html: string, baseUrl: string) => {
  const $ = cheerio.load(html);

  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('link[rel="image_src"]').attr('href'),
    $('img[src]').first().attr('src'),
    $('img[data-src]').first().attr('data-src'),
    $('img[data-original]').first().attr('data-original'),
  ];

  const imageUrl = candidates.find(Boolean);

  if (!imageUrl) return null;

  return new URL(imageUrl, baseUrl).toString();
};

export const normalizeUrls = (value: string): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeUrls(item));
  }

  return String(value)
    .replace(/['"`]/g, '')
    .split(/\s+/)
    .map((url) => url.trim())
    .filter((url) => url.startsWith('http'));
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const toHtml = (text?: string): string => {
  if (!text?.trim()) return '';
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${l}</p>`)
    .join('');
};

export const formatTags = (
  tags?: string,
  category?: string,
  type?: string,
  best?: string,
  newT?: string,
): string => {
  const set = new Set<string>();
  if (tags)
    tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => set.add(t));
  if (category) set.add(category.trim());
  if (type) set.add(type.trim());
  if (best) set.add(best.trim());
  if (newT) set.add(newT.trim());
  return Array.from(set).join(', ');
};

export const toRichTextParagraphs = (
  text: string,
): RichTextRoot | undefined => {
  if (!text?.trim()) return undefined;

  const paragraphs = text
    .replace(/<meta[^>]*>/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (line): RichTextParagraph => ({
        type: 'paragraph',
        children: [{ type: 'text', value: line }],
      }),
    );

  if (paragraphs.length === 0) return undefined;
  return { type: 'root', children: paragraphs };
};

export const toRichTextList = (
  text: string,
  listType: 'ordered' | 'unordered',
): RichTextRoot | undefined => {
  if (!text?.trim()) return undefined;

  const items = text
    .split(',')
    .map((i) => i.trim())
    .filter(Boolean);

  if (items.length === 0) return undefined;

  const prefix = listType === 'unordered' ? '• ' : '';
  const combined = items
    .map((item, idx) =>
      listType === 'ordered' ? `${idx + 1}. ${item}` : `${prefix}${item}`,
    )
    .join('\n');

  return {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: combined }],
      },
    ],
  };
};

export const toRichTextText = (text?: string): RichTextRoot | undefined => {
  if (!text?.trim()) return undefined;

  return {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim(),
          },
        ],
      },
    ],
  };
};

export const toRichTextOrderedList = (
  text: string,
): RichTextRoot | undefined => {
  if (!text?.trim()) return undefined;

  const items = text
    .replace(/[\r\n]+/g, ' ')
    .split(/\s*\d+\.\s+/)
    .map((i) => i.trim())
    .filter(Boolean);

  if (items.length === 0) return undefined;

  const combined = items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');

  return {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: combined }],
      },
    ],
  };
};
