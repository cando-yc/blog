// 全站設定 — 文案先放佔位，之後統一在這裡改（不用動各頁）
export const SITE = {
  name: '奕成財創',
  // 部落格獨立內容品牌（masthead／標題／RSS 用；公司名 name 留在頁尾）
  blogName: '財會有可為',
  nameEn: 'YiCheng',
  abbr: 'YCFS',                             // Yicheng Financial Solutions 簡稱
  fullEn: 'Yicheng Financial Solutions',
  authorEn: 'Cando Yeh',
  // 定位一句話與副標（首頁 hero 用）— 問題解決者、非賣服務；TA＝中小/一人公司老闆
  positioning: '企業主的外部財務長',
  tagline: '財務的事整包交給我，你把時間花在把生意做大。',
  // 品牌副標／首頁 <title> 用的一句（瀏覽器分頁／SEO／masthead 副標）
  titleTagline: '分享財會在企業內部的大小事',
  // 全站預設 meta 描述（分享預覽／SEO）——描述型、非推銷
  description: '生意由你顧，財會有可為',
  // 【待補】Cal.com 或預約表單連結
  bookingUrl: '#',
  email: 'contact@ycfinance.tw',
  // Cando 個人 FB
  fb: 'https://www.facebook.com/yichengfinance',
  // Cloudflare Web Analytics beacon token（後台 Web Analytics → 加站點 blog.ycfinance.tw 取得，填了才載入）
  cfBeaconToken: '0d4b745d674d494d8380f8230cfd6330',
};

// 導覽（首頁不放大肖像；人在作者頁）
export const NAV = [
  { label: '文章', href: '/articles' },
  { label: '服務', href: '/services' },
  { label: '預約', href: '/book' },
];

// 三欄目（對應規劃 §二）
export const CATEGORIES: Record<string, string> = {
  A: '財務決策支援',
  B: 'AI × 財會實戰',
  C: '財稅實戰案例',
};
