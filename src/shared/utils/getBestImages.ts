export function getBestImages(urls: string[]): string[] {
  const map = new Map<string, { url: string; score: number }>();

  for (const rawUrl of urls) {
    try {
      const u = new URL(rawUrl);

      const width = parseInt(u.searchParams.get('width') || '0', 10);
      const height = parseInt(u.searchParams.get('height') || '0', 10);

      u.searchParams.delete('width');
      u.searchParams.delete('height');
      u.searchParams.delete('w');
      u.searchParams.delete('h');
      u.searchParams.delete('size');

      const base = u.toString();

      const score = width * height || width || height || 0;

      const existing = map.get(base);

      if (!existing || score > existing.score) {
        map.set(base, { url: rawUrl, score });
      }
    } catch {
      continue;
    }
  }

  return Array.from(map.values()).map((v) => v.url);
}
