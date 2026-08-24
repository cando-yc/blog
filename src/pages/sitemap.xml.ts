import { getCollection } from 'astro:content';
import { BASE } from '../lib/schema';

export async function GET() {
  const posts = (await getCollection('articles', ({ data }) => (import.meta.env.PROD ? !data.draft : true)))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  // loc 一律帶尾斜線，與站台 canonical 一致；少了斜線會被 307 轉址，GSC 會報「網頁會重新導向」
  const staticUrls = [
    { loc: `${BASE}/`, lastmod: undefined as string | undefined },
    { loc: `${BASE}/articles/`, lastmod: posts[0]?.data.pubDate.toISOString() },
  ];
  const postUrls = posts.map((p) => ({
    loc: `${BASE}/articles/${p.id}/`,
    lastmod: p.data.pubDate.toISOString(),
  }));

  const entries = [...staticUrls, ...postUrls]
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
