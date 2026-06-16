export function applicationToRichText(value: string) {
  if (!value) return null;

  const clean = value
    .replace(/<meta[^>]*>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/"+/g, '')
    .trim();

  const items = clean
    .split(/\s*\d+\.\s+/)
    .filter(Boolean)
    .map((item) => item.trim());

  return JSON.stringify({
    type: 'root',
    children: [
      {
        type: 'list',
        listType: 'ordered',
        children: items.map((text) => ({
          type: 'list-item',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  value: text,
                },
              ],
            },
          ],
        })),
      },
    ],
  });
}
