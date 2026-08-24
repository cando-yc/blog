# 奕成財創官網 ycfinance.tw（YiCheng）

一個 Astro 專案、一個網域：**行銷首頁＋案例＋文章庫（財會有可為）＋聯絡表單 API**。
2026/08/24 起原本的 SvelteKit 官網（`operation/website/`）併進來，`blog.ycfinance.tw` 只做 301。

> 規劃文件：`my-agent/100_Todo/projects/2026-07-04_官網內容引擎規劃.md`。文章清單與待寫題庫 SSOT＝repo 根目錄 `文章總表.md`（每週二一篇）。

## 兩套版型並存（刻意的）

| 區域 | 版型 | 樣式 | 來源 |
|---|---|---|---|
| 首頁 `/`、案例 `/cases/*`、隱私 `/privacy` | `layouts/SiteBase.astro` | `styles/site.css`（Tailwind v4＋原官網 CSS 變數）、GA | 原 SvelteKit 官網 |
| 文章庫 `/articles/`、文章頁、`/about` | `layouts/Base.astro` | `styles/global.css`（JDP 式極簡：純白＋克制金＋Noto Serif） | 原 blog |

兩套 CSS 只在各自頁面載入，`:root` 變數同名不會互相污染。首頁是原本 3,000 行的 `+page.svelte` 原樣掛成 `components/site/HomePage.svelte`（`client:load`），自我診斷、動畫、表單全在元件內，不用碰。

## 開發／部署

```bash
npm install
npm run dev      # http://localhost:4321（/api/contact 也能跑，但沒金鑰會回 500）
npm run build    # astro build → dist/（會自動寫 dist/.assetsignore）
npm run deploy   # build + wrangler deploy（Cloudflare Workers：靜態資產＋一支 worker）
```

部署架構（`wrangler.jsonc`）：
- `main: worker/entry.mjs` — 自己的包裝：處理 `blog.` / `www.` → `ycfinance.tw` 301（`vars.LEGACY_REDIRECT` 為 `"1"` 才啟用），再交給 Astro 產生的 `dist/_worker.js`（只有 `/api/contact` 是真的在 worker 上跑，其餘全是靜態資產）。
- `assets.run_worker_first: true` — 所有請求先進 worker，才攔得到舊主機名。
- `workers_dev: true` — 預覽網址 `https://blog.cando-yeh.workers.dev`。
- Secrets（表單寄信用，`npx wrangler secret put <NAME>`）：`RESEND_API_KEY`、`RESEND_FROM_EMAIL`，選填 `CONTACT_TO_EMAIL`（預設 cando.yeh@ycfinance.tw）。

## ⚠️ Google Drive 注意

這個 repo 放在共用雲端硬碟。`node_modules/`、`dist/`、`.wrangler/` **不要讓 Drive 同步**（`.gitignore` 已排除，但 Drive 桌面版仍可能嘗試同步）。

## 結構

```
worker/entry.mjs         Worker 入口（舊主機名 301 → Astro handler）
src/
  consts.ts              全站設定（站名、作者、導覽 NAV、欄目、預約連結）— 先改這裡
  content.config.ts      文章 collection schema
  lib/cases.ts           案例資料（4 篇）
  lib/schema.ts          JSON-LD（Organization / WebSite / Person / Article）
  styles/global.css      文章區設計系統
  styles/site.css        行銷頁設計系統（Tailwind）
  layouts/Base.astro     文章區外殼（head + Nav + Footer；home=true 顯示 masthead）
  layouts/SiteBase.astro 行銷頁外殼（head + GA，無共用導覽）
  components/site/HomePage.svelte  首頁一頁式（原 SvelteKit +page.svelte）
  components/            Nav / Masthead / Footer / ArticleCard / AuthorCard / Subscribe
  pages/
    index.astro          官網首頁（掛 HomePage.svelte）
    articles/index.astro 文章庫＝「財會有可為」入口（masthead＋欄目分區＋訂閱＋作者卡）
    articles/[...slug].astro  單篇文章
    cases/[slug].astro   案例頁
    about.astro          作者頁（葉可為）
    privacy.astro        隱私權政策（noindex）
    api/contact.ts       聯絡表單 endpoint（prerender=false，Resend）
    rss.xml.ts / sitemap.xml.ts
  content/articles/      文章 .md
public/                  favicon、封面圖（<slug>.webp）、og-image.jpg、hero-background.png、robots.txt
```

## 內容怎麼發

在 `src/content/articles/` 新增文章：

```md
---
title: 文章標題
description: 一句話描述（列表與 SEO 用）
pubDate: 2026-08-01
category: A        # A=財務決策支援 / B=AI×財會實戰 / C=財稅實戰案例（顯示名 SSOT=consts.ts）
image: /my-slug.webp   # 封面 16:9（1672×941）放 public/、檔名=文章 slug；沒圖不發布
draft: false       # true = 只在 dev 顯示、不進正式站
---
```

文章頁文末的「預約 30 分鐘初談」連 `/#contact`（首頁聯絡表單）；`consts.ts` 的 `bookingUrl` 改一處全站生效。

## 命名規則

**檔名＝網址 slug，永久、影響 SEO**：英文小寫、kebab-case、描述主題；不含分類、不含日期。

| 類型 | 規則 | 範例 |
|---|---|---|
| 系列文 | `<系列碼>-<兩位數序號>-<主題>` | `finance-dept-02-bookkeeping` |
| 案例文 | `case-<主題>` | `case-vat-markup-pricing` |
| 一般單篇 | `<主題>` | `deemed-estate-land-value-tax` |

⚠️ `src/content/articles/` 底下**只放文章 `.md`**（缺 frontmatter 會 build 失敗）。

## 網址與 SEO

- `site`＝`https://ycfinance.tw`；canonical、OG、sitemap、RSS link 全用它。
- RSS 的 `<guid>` 刻意沿用 `https://blog.ycfinance.tw/articles/<slug>`（訂閱端的「看過沒」識別碼，改了舊文會被重推）；新文章也沿用同一規則，不要改。
- `blog.ycfinance.tw/*` → `ycfinance.tw/*`（同路徑；根路徑 → `/articles/`）、`www` → apex，皆 301，至少保留一年。
