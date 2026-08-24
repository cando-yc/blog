import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// 支援 Obsidian 螢光筆語法 ==重點== → <mark>重點</mark>（渲染成品牌色底色）
// 只作用在文字節點；程式碼區塊 / inline code 不受影響。
function remarkHighlight() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        if (child.type === 'text' && child.value.includes('==')) {
          child.value.split(/==(.+?)==/g).forEach((part, i) => {
            if (part === '') return;
            out.push(i % 2 === 1
              ? { type: 'html', value: `<mark>${part}</mark>` }
              : { type: 'text', value: part });
          });
        } else {
          walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}

// 2026/08/24 兩站合一：ycfinance.tw 為唯一網域（行銷首頁＋文章庫），blog.ycfinance.tw 只做 301。
// 行銷頁（首頁／案例／隱私）用 Svelte 元件＋Tailwind（src/styles/site.css）；文章區維持 global.css。
// 靜態輸出為主，只有 /api/contact 走 Cloudflare Worker（prerender = false）。
export default defineConfig({
  site: 'https://ycfinance.tw',
  integrations: [svelte()],
  adapter: cloudflare({ imageService: 'compile' }),
  vite: { plugins: [tailwindcss()] },
  markdown: {
    remarkPlugins: [remarkHighlight],
  },
});
