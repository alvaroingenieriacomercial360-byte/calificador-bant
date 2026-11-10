import { json, pinValido } from '../lib/comun.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  if (!pinValido(req)) return json({ ok: false, error: 'Clave de acceso incorrecta' }, 401);

  const url = process.env.APPS_SCRIPT_URL, secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) return json({ ok: false, error: 'Falta configurar APPS_SCRIPT_URL y APPS_SCRIPT_SECRET en Netlify.' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Solicitud inválida' }, 400); }
  if (!body || !body.lead || !body.lead.nombre) return json({ ok: false, error: 'Faltan los datos del lead' }, 400);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, lead: body.lead, ia: body.ia || null }),
      redirect: 'follow',
      signal: AbortSignal.timeout(9500)
    });
    const data = await res.json();
    if (!data.ok) return json({ ok: false, error: 'Google respondió: ' + (data.error || 'error desconocido') }, 502);
    return json({ ok: true, docUrl: data.docUrl, sheetUrl: data.sheetUrl });
  } catch (e) {
    const tiempo = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return json({
      ok: false,
      error: tiempo ? 'Google tardó demasiado. El informe puede haberse creado: revisa la carpeta antes de volver a guardar.'
                    : 'No se pudo contactar el script de Google.'
    }, 502);
  }
};
