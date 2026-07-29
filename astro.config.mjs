import { defineConfig } from 'astro/config';

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

// 網域確定後改成正式 URL(影響 SEO / sitemap / canonical)
export default defineConfig({
  site: 'https://blog.ycfinance.tw',
  markdown: {
    remarkPlugins: [remarkHighlight],
  },
});
