export const config = { runtime: 'edge' };

// проксируем только файлы с этих доменов, чтобы функцию нельзя было юзать как открытый прокси
const ALLOWED = ['tikwm.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'tiktokv.us'];

export default async function handler(req) {
  const p = new URL(req.url).searchParams;
  const src = p.get('src') || '';
  const name = (p.get('name') || 'tiktok').replace(/[^\w.-]/g, '_');

  let u;
  try {
    u = new URL(src);
  } catch {
    return new Response('bad url', { status: 400 });
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || !ALLOWED.some((d) => host === d || host.endsWith('.' + d))) {
    return new Response('forbidden', { status: 403 });
  }

  const up = await fetch(src, {
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://www.tiktok.com/' },
  });
  if (!up.ok) return new Response('upstream error', { status: 502 });

  return new Response(up.body, {
    headers: {
      'content-type': up.headers.get('content-type') || 'application/octet-stream',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    },
  });
}
