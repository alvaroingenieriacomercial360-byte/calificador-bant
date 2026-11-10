import { json, pinValido } from '../lib/comun.mjs';

const SISTEMA = `Eres analista comercial de M&M Tech House. Su producto, Impulsoee, es un software que mide la eficiencia (OEE) de cada máquina, línea y planta con los datos del PLC que la planta ya tiene.
Recibes la calificación BANT de un lead hecha por la setter. Responde SOLO con un objeto JSON válido, sin texto antes ni después y sin bloques de código, con estas claves:
- "resumen": 3 o 4 frases sobre el lead y qué tan bien encaja.
- "riesgos": lista de máximo 3 riesgos u objeciones probables.
- "siguiente_paso": una acción concreta para la setter, coherente con el veredicto.
- "mensaje_whatsapp": un mensaje corto, cordial y profesional para enviarle al lead según su veredicto.
No inventes datos que no estén en la información recibida. No menciones precios.`;

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  if (!pinValido(req)) return json({ ok: false, error: 'Clave de acceso incorrecta' }, 401);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ ok: false, error: 'La IA no está configurada (falta ANTHROPIC_API_KEY).', sinIA: true });

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Solicitud inválida' }, 400); }
  const lead = body && body.lead;
  if (!lead) return json({ ok: false, error: 'Faltan los datos del lead' }, 400);

  // Solo se envía a la IA lo necesario para el análisis (sin el número de WhatsApp).
  const datos = {
    nombre: lead.nombre, empresa: lead.empresa, cargo: lead.cargo, origen: lead.origen,
    calificacion: `${lead.rating}/10`, veredicto: lead.veredicto, accion: lead.accion,
    bant: lead.bant, topes: lead.caps, notas_setter: lead.notes
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 800,
        system: SISTEMA,
        messages: [{ role: 'user', content: JSON.stringify(datos) }]
      }),
      signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) {
      const detalle = (await res.text()).slice(0, 300);
      return json({ ok: false, error: `La IA respondió con error ${res.status}.`, detalle }, 502);
    }
    const data = await res.json();
    const texto = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
      .replace(/```json|```/g, '').trim();
    const ia = JSON.parse(texto);
    return json({
      ok: true,
      ia: {
        resumen: String(ia.resumen || ''),
        riesgos: Array.isArray(ia.riesgos) ? ia.riesgos.slice(0, 3).map(String) : [],
        siguiente_paso: String(ia.siguiente_paso || ''),
        mensaje_whatsapp: String(ia.mensaje_whatsapp || '')
      }
    });
  } catch (e) {
    const tiempo = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return json({ ok: false, error: tiempo ? 'La IA tardó demasiado en responder.' : 'No se pudo interpretar la respuesta de la IA.' }, 502);
  }
};
