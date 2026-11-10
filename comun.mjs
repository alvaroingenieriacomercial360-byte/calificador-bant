export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

/** Si TOOL_PIN está configurado, exige que la petición traiga la misma clave. */
export function pinValido(req) {
  const pin = process.env.TOOL_PIN;
  if (!pin) return true;
  return req.headers.get('x-tool-pin') === pin;
}
