# 奕成財創官網（YiCheng）

Astro 靜態站。文章用 Markdown（`src/content/articles/*.md`），在 Obsidian 寫好丟進去即發佈。
設計方向：JDP 式極簡編輯風、墨底＋一個金色重點、首頁不放大肖像（定位＋作品打頭陣，人退到作者頁）。

> 規劃文件：`my-agent/100_Todo/projects/2026-07-04_官網內容引擎規劃.md`（§六 建置規劃）。
> **這是空框架，尚無任何真內容**——結構就位，內容之後再囤（開站門檻 ≥ 8–10 篇）。

## 開發

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 產出 dist/
npm run preview  # 預覽 build 結果
```

## ⚠️ Google Drive 注意

這個 repo 放在共用雲端硬碟。`node_modules/`（數萬檔）與 `dist/` **不要讓 Drive 同步**——`.gitignore` 已排除，但 Drive 桌面版仍可能嘗試同步。建議：把整個資料夾設為「僅線上」以外的本機開發時，`node_modules` 的同步關掉，或改在本機非 Drive 路徑開發、只把 `src/` 內容回寫 Drive。長期最好接 GitHub + Cloudflare Pages/Netlify 自動部署，Drive 只留原始碼備份。

## 結構

```
src/
  consts.ts              全站設定（站名、作者、導覽、欄目）— 先改這裡
  content.config.ts      文章 collection schema
  styles/global.css      設計系統（配色/字體/格線/深淺色）
  layouts/Base.astro     HTML 外殼 + <head> + Nav + Footer
  components/             Nav / Footer / ArticleCard
  pages/
    index.astro          首頁
    articles/index.astro  文章庫
    articles/[...slug].astro  單篇文章模板
    about.astro          關於作者（＝作者頁，含奕成一段）
    services.astro       服務
    book.astro           預約（Cal.com 待接）
  content/articles/      文章 .md（目前空）
public/                  favicon、圖片、之後放儀表板截圖
```

## 內容怎麼發

> 文章清單與待寫題庫 SSOT＝repo 根目錄 `文章總表.md`（發文節奏：每週二一篇）。

在 `src/content/articles/` 新增文章（檔名見下方命名規則）：

```md
---
title: 文章標題
description: 一句話描述（列表與 SEO 用）
pubDate: 2026-08-01
category: A        # A=財務決策支援 / B=AI×財會實戰 / C=財稅實戰案例（顯示名 SSOT=consts.ts）
image: /my-slug.webp   # 選填；圖放 public/、先壓 WebP、檔名=文章 slug
draft: false       # true = 只在 dev 顯示、不進正式站
---

正文（Markdown）……
```

> 首頁「精選」＝所有非草稿文章中 `pubDate` 最新的那篇。內文放圖：`![說明](/圖.webp)`。

## 命名規則（文章一多才不會亂）

**檔名＝網址 slug，永久、影響 SEO**：英文小寫、kebab-case、描述主題；**不含分類、不含日期**（這兩個都在 frontmatter、會變，綁進檔名會害你之後改分類就得改網址）。

| 類型 | 規則 | 範例 |
|---|---|---|
| 系列文 | `<系列碼>-<兩位數序號>-<主題>` | `finance-dept-02-bookkeeping` |
| 案例文 | `case-<主題>` | `case-vat-markup-pricing` |
| 一般單篇 | `<主題>` | `report-not-for-you` |

系列碼：打造財務部系列＝`finance-dept`（之後有新系列再定碼）。

**配圖（放 `public/`，一律 WebP）**：檔名＝文章 slug → `public/<slug>.webp`。同篇多圖用 `<slug>-2.webp` 或帶描述 `<slug>-flow.webp`。與特定文章無關的通用素材才語意命名（`abstract-*.svg`、`og-default.webp`）。

⚠️ `src/content/articles/` 底下**只放文章 `.md`**（loader 會把每個 `.md` 當文章，缺 frontmatter 會 build 失敗）——別在這放 README 或筆記。

## 待接（框架就位、之後補）

- [ ] `consts.ts` 定位文案 / 導覽最終定稿
- [ ] Cal.com 預約連結接進 `book.astro`
- [ ] 作者頁 `about.astro` 個人簡介 / 資歷 / 照片
- [ ] 服務頁 `services.astro` 服務分層 / 收費
- [ ] 儀表板 / 策略地圖截圖放 `public/`（首頁與文章視覺素材）
- [ ] 網域 + 部署（Cloudflare Pages / Netlify）
