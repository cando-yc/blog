import { getCollection } from 'astro:content';
import { SITE } from '../consts';
import { BASE } from '../lib/schema';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const posts = (await getCollection('articles', ({ data }) => (import.meta.env.PROD ? !data.draft : true)))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${BASE}/articles/${p.id}/</link>
      <!-- guid 是訂閱端的「看過沒」識別碼，一旦改動所有舊文會被當新文重推，故維持無尾斜線原樣 -->
      <guid>${BASE}/articles/${p.id}</guid>
      <pubDate>${p.data.pubDate.toUTCString()}</pubDate>
      ${p.data.description ? `<description>${esc(p.data.description)}</description>` : ''}
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE.blogName)}｜文章</title>
    <link>${BASE}</link>
    <description>${esc(SITE.description)}</description>
    <language>zh-Hant</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
