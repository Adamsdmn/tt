export const config = { runtime: 'edge' };

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const abs = (p) => (!p ? null : p.startsWith('http') ? p : 'https://www.tikwm.com' + p);

async function ask(url) {
  const r = await fetch('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url), {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });
  return r.json().catch(() => null);
}

export default async function handler(req) {
  try {
    return await run(req);
  } catch (e) {
    return json({ error: 'Сервер не смог достучаться до API: ' + (e && e.message ? e.message : e) }, 502);
  }
}

async function run(req) {
  const url = new URL(req.url).searchParams.get('url') || '';
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {}
  if (!/(^|\.)tiktok\.com$/.test(host)) return json({ error: 'Нужна ссылка на TikTok' }, 400);

  let j = await ask(url);
  // бесплатный API ограничен ~1 запрос/сек — один повтор
  if (j && j.code !== 0 && /limit/i.test(j.msg || '')) {
    await new Promise((r) => setTimeout(r, 1300));
    j = await ask(url);
  }
  if (!j || j.code !== 0) {
    return json({ error: (j && j.msg) || 'Не удалось получить видео. Проверь ссылку' }, 502);
  }

  const d = j.data;
  return json({
    title: d.title || '',
    author: (d.author && (d.author.unique_id || d.author.nickname)) || '',
    cover: abs(d.cover),
    video: abs(d.play),
    hd: abs(d.hdplay),
    music: abs(d.music),
    images: (d.images || []).map(abs),
  });
}
