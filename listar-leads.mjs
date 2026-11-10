import { json, pinValido } from '../lib/comun.mjs';

export default async (req) => {
  if (!pinValido(req)) return json({ ok: false, error: 'Clave de acceso incorrecta' }, 401);
  const url = process.env.APPS_SCRIPT_URL, secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) return json({ ok: false, error: 'Falta configurar APPS_SCRIPT_URL y APPS_SCRIPT_SECRET en Netlify.' }, 500);
  try {
    const res = await fetch(`${url}?secret=${encodeURIComponent(secret)}`, { redirect: 'follow', signal: AbortSignal.timeout(9500) });
    const data = await res.json();
    if (!data.ok) return json({ ok: false, error: 'Google respondió: ' + (data.error || 'error desconocido') }, 502);
    return json({ ok: true, leads: data.leads || [], sheetUrl: data.sheetUrl });
  } catch (e) {
    return json({ ok: false, error: 'No se pudo leer la base de leads.' }, 502);
  }
};
