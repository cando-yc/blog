// Worker 入口包裝：舊主機名 301 → 交給 Astro 的 Cloudflare handler（含 /api/contact 與靜態資產回退）
import astro from '../dist/_worker.js/index.js';

const CANONICAL_HOST = 'ycfinance.tw';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // LEGACY_REDIRECT（wrangler vars）＝'1' 才啟用舊主機名轉址；網域切到本 worker 前保持 '0'，blog.ycfinance.tw 照常服務
    const redirectOn = env?.LEGACY_REDIRECT === '1';
    if (redirectOn && (url.hostname === 'blog.ycfinance.tw' || url.hostname === 'www.ycfinance.tw')) {
      const target = new URL(url);
      target.protocol = 'https:';
      target.hostname = CANONICAL_HOST;
      // 舊 blog 首頁 → 文章庫；其餘路徑（/articles/*、/rss.xml、圖片）在新站路徑相同，原樣帶過去
      if (url.hostname === 'blog.ycfinance.tw' && (url.pathname === '/' || url.pathname === '')) {
        target.pathname = '/articles/';
      }
      return Response.redirect(target.toString(), 301);
    }

    // 過渡期（轉址未開）：舊 blog 主機名的首頁改讀文章庫，讀者不會看到公司首頁
    if (!redirectOn && url.hostname === 'blog.ycfinance.tw' && (url.pathname === '/' || url.pathname === '')) {
      const rewritten = new URL(url); rewritten.pathname = '/articles/';
      request = new Request(rewritten.toString(), request);
    }

    const res = await astro.fetch(request, env, ctx);
    // 保險：Astro handler 沒接到的路徑，直接由靜態資產回應
    if (res.status === 404 && env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    }
    return res;
  },
};
