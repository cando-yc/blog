// 聯絡表單 API（原 SvelteKit /api/contact，改為 Astro on-demand endpoint，跑在 Cloudflare Worker）
// 寄信走 Resend；金鑰以 Worker secret 提供：RESEND_API_KEY、RESEND_FROM_EMAIL（wrangler secret put）。
// 原本的 sendmail 備援在 Cloudflare 上跑不了，已移除。
export const prerender = false;

import type { APIRoute } from 'astro';

const CONTACT_TO_EMAIL_DEFAULT = 'cando.yeh@ycfinance.tw';

/* ── Rate limiting (in-memory, per IP；每個 isolate 各自計數，夠用) ── */
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

type ContactPayload = { name: string; phone: string; email: string; revenue: string };

const normalizeText = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/* 選填：網站六題診斷的作答結果（字串陣列，最多 6 條、每條 200 字內） */
function normalizeDiagnosis(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 200)
    .slice(0, 6);
}

const sanitizeHeader = (v: string) => v.replace(/[\r\n]+/g, ' ').trim();
const escapeHtml = (v: string) =>
  v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function buildContactPayload(data: Record<string, unknown>): ContactPayload {
  return {
    name: normalizeText(data.name),
    phone: normalizeText(data.phone),
    email: normalizeText(data.email),
    revenue: normalizeText(data.revenue),
  };
}

function validatePayload(data: ContactPayload) {
  for (const [field, value] of Object.entries(data)) {
    if (!value) return `缺少必填欄位：${field}`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Email 格式不正確';
  const maxLengths: Record<keyof ContactPayload, number> = { name: 80, phone: 40, email: 120, revenue: 80 };
  for (const [field, limit] of Object.entries(maxLengths) as Array<[keyof ContactPayload, number]>) {
    if (data[field].length > limit) return `${field} 長度超過限制`;
  }
  return null;
}

function buildEmailContent(data: ContactPayload, diagnosis: string[]) {
  const subject = sanitizeHeader(`【網站預約】${data.name}`);
  const plainText = [
    '奕成財創網站收到新的初步評估預約。',
    '',
    `姓名：${data.name}`,
    `電話：${data.phone}`,
    `Email：${data.email}`,
    `營收規模：${data.revenue}`,
    ...(diagnosis.length > 0 ? ['', '── 網站六題診斷作答 ──', ...diagnosis] : []),
  ].join('\n');
  const diagnosisHtml =
    diagnosis.length > 0
      ? `<h3 style="margin-top:20px;">網站六題診斷作答</h3><ul>${diagnosis.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
      : '';
  const html = `
    <h2>奕成財創網站收到新的初步評估預約</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;"><strong>姓名</strong></td><td>${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>電話</strong></td><td>${escapeHtml(data.phone)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Email</strong></td><td>${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>營收規模</strong></td><td>${escapeHtml(data.revenue)}</td></tr>
    </table>
    ${diagnosisHtml}
  `.trim();
  return { subject, plainText, html };
}

function buildConfirmationContent(data: ContactPayload) {
  const subject = '已收到您的預約｜奕成財創';
  const plainText = [
    `${data.name} 您好，`,
    '',
    '已收到您的初步評估預約，我會在 1 個工作天內與您聯繫。',
    '',
    '想先聊聊，歡迎加 LINE：https://line.me/R/ti/p/@075dfgfv',
    '',
    '奕成財創有限公司',
    'https://ycfinance.tw',
  ].join('\n');
  const html = `
    <p>${escapeHtml(data.name)} 您好，</p>
    <p>已收到您的初步評估預約，我會在 <strong>1 個工作天內</strong>與您聯繫。</p>
    <p>想先聊聊，歡迎加 LINE：<a href="https://line.me/R/ti/p/@075dfgfv">@075dfgfv</a></p>
    <p style="margin-top:24px;color:#555;">奕成財創有限公司<br/><a href="https://ycfinance.tw">ycfinance.tw</a></p>
  `.trim();
  return { subject, plainText, html };
}

type Env = { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string; CONTACT_TO_EMAIL?: string };

async function resendSend(env: Env, payload: Record<string, unknown>, label: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, ...payload }),
  });
  if (!response.ok) throw new Error(`Resend ${label} error: ${response.status} ${await response.text()}`);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const runtimeEnv = ((locals as { runtime?: { env?: Env } }).runtime?.env ?? {}) as Env;
  const env: Env = {
    RESEND_API_KEY: runtimeEnv.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: runtimeEnv.RESEND_FROM_EMAIL ?? import.meta.env.RESEND_FROM_EMAIL,
    CONTACT_TO_EMAIL: runtimeEnv.CONTACT_TO_EMAIL ?? import.meta.env.CONTACT_TO_EMAIL ?? CONTACT_TO_EMAIL_DEFAULT,
  };
  const contactTo = env.CONTACT_TO_EMAIL ?? CONTACT_TO_EMAIL_DEFAULT;

  try {
    let ip = 'unknown';
    try { ip = clientAddress; } catch { ip = request.headers.get('cf-connecting-ip') ?? 'unknown'; }
    if (!checkRateLimit(ip)) return json({ success: false, message: '請求過於頻繁，請稍後再試。' }, 429);

    const rawData = (await request.json()) as Record<string, unknown>;
    const data = buildContactPayload(rawData);
    const diagnosis = normalizeDiagnosis(rawData.diagnosis);
    const validationError = validatePayload(data);
    if (validationError) return json({ success: false, message: validationError }, 400);

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      throw new Error('RESEND_API_KEY / RESEND_FROM_EMAIL 未設定（wrangler secret put）');
    }

    const notice = buildEmailContent(data, diagnosis);
    await resendSend(env, { to: [contactTo], reply_to: data.email, subject: notice.subject, text: notice.plainText, html: notice.html }, 'notify');

    /* 確認信寄失敗不影響預約成功——通知信已寄達即可 */
    try {
      const confirm = buildConfirmationContent(data);
      await resendSend(env, { to: [data.email], reply_to: contactTo, subject: confirm.subject, text: confirm.plainText, html: confirm.html }, 'confirmation');
    } catch (confirmErr) {
      console.error('Confirmation email error:', confirmErr);
    }

    return json({ success: true, message: '已收到您的預約，我會在 1 個工作天內與您聯繫。' });
  } catch (err) {
    console.error('Contact form error:', err);
    return json({ success: false, message: `寄信失敗，請稍後再試，或直接來信至 ${contactTo}` }, 500);
  }
};
