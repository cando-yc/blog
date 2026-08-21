// JSON-LD 結構化資料（SEO / AEO）——用 @id 互相連結成一張 graph
import { SITE } from '../consts';

export const BASE = 'https://blog.ycfinance.tw';

export const organization = {
  '@type': 'Organization',
  '@id': `${BASE}/#org`,
  name: SITE.name,
  alternateName: SITE.fullEn,
  url: BASE,
  email: SITE.email,
  founder: { '@type': 'Person', '@id': `${BASE}/#cando` },
  sameAs: [SITE.fb],
};

export const website = {
  '@type': 'WebSite',
  '@id': `${BASE}/#site`,
  name: SITE.blogName,
  alternateName: SITE.titleTagline,
  url: BASE,
  inLanguage: 'zh-Hant',
  publisher: { '@id': `${BASE}/#org` },
};

export const person = {
  '@type': 'Person',
  '@id': `${BASE}/#cando`,
  name: SITE.authorEn,
  jobTitle: SITE.positioning,
  description: '美國執業會計師（AICPA），近 20 年財務、會計與稅務實戰經驗，橫跨外商、中小企業到新創。',
  url: 'https://ycfinance.tw',
  image: `${BASE}/cando-portrait.webp`,
  worksFor: { '@id': `${BASE}/#org` },
  sameAs: [SITE.fb],
};

interface ArticleInput {
  url: string;
  title: string;
  description?: string;
  image?: string;
  datePublished: string;
}

export function articleSchema({ url, title, description, image, datePublished }: ArticleInput) {
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: title,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    datePublished,
    dateModified: datePublished,
    inLanguage: 'zh-Hant',
    author: { '@id': `${BASE}/#cando` },
    publisher: { '@id': `${BASE}/#org` },
    isPartOf: { '@id': `${BASE}/#site` },
    mainEntityOfPage: url,
  };
}

export function breadcrumb(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
