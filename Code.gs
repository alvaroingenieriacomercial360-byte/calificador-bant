/**
 * Calificador BANT · Impulsoee — backend en Google Apps Script.
 * Se instala en la cuenta alvaroingenieriacomercial360@gmail.com.
 * Por cada lead: crea un Google Doc con el informe y agrega una fila en la hoja "Base de leads Impulsoee".
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   SECRET     (obligatoria) clave compartida con Netlify (APPS_SCRIPT_SECRET)
 *   FOLDER_ID  (opcional)    carpeta de Drive; si no existe, se crea sola
 *   SHEET_ID   (opcional)    hoja de cálculo; si no existe, se crea sola
 */

const FOLDER_NAME = 'Leads Impulsoee – Calificaciones BANT';
const SHEET_NAME = 'Base de leads Impulsoee';
const HEADERS = ['Fecha', 'Calificado por', 'Nombre', 'Empresa', 'Cargo', 'WhatsApp', 'Origen', 'Código del anuncio',
  'Nota (1-10)', 'Puntaje exacto', 'Veredicto', 'B', 'A', 'N', 'T', 'Topes', 'Resumen IA', 'Siguiente paso', 'Informe'];

/** Ejecútala una vez a mano para autorizar el script y crear la carpeta y la hoja. */
function configurar() {
  const folder = getFolder_();
  const ss = getSheet_(folder);
  Logger.log('Carpeta: ' + folder.getUrl());
  Logger.log('Hoja de leads: ' + ss.getUrl());
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkSecret_(body.secret)) return json_({ ok: false, error: 'unauthorized' });
    if (!body.lead || !body.lead.nombre) return json_({ ok: false, error: 'lead incompleto' });
    const lock = LockService.getScriptLock();
    lock.waitLock(8000);
    try {
      const folder = getFolder_();
      const ss = getSheet_(folder);
      const docUrl = createReport_(body.lead, body.ia || null, folder);
      appendRow_(ss, body.lead, body.ia || null, docUrl);
      return json_({ ok: true, docUrl: docUrl, sheetUrl: ss.getUrl() });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!checkSecret_(p.secret)) return json_({ ok: false, error: 'unauthorized' });
  const ss = getSheet_(getFolder_());
  const sh = ss.getSheets()[0];
  const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, leads: [], sheetUrl: ss.getUrl() });
  const n = Math.min(300, last - 1);
  const values = sh.getRange(last - n + 1, 1, n, HEADERS.length).getDisplayValues().reverse();
  const leads = values.map(r => ({
    fecha: r[0], setter: r[1], nombre: r[2], empresa: r[3], cargo: r[4],
    nota: r[8], veredicto: r[10], informe: r[18]
  }));
  return json_({ ok: true, leads: leads, sheetUrl: ss.getUrl() });
}

/* ---------- utilidades ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function checkSecret_(secret) {
  const s = PropertiesService.getScriptProperties().getProperty('SECRET');
  return !!s && secret === s;
}

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se crea de nuevo */ }
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function getSheet_(folder) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* se crea de nuevo */ }
  }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  const sh = ss.getSheets()[0];
  sh.setName('Leads');
  sh.appendRow(HEADERS);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#26415F').setFontColor('#FFFFFF');
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

/** Evita que un texto escrito por el usuario se interprete como fórmula en la hoja. */
function safe_(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function appendRow_(ss, lead, ia, docUrl) {
  const sh = ss.getSheets()[0];
  const sc = lead.segScores || {};
  sh.appendRow([
    safe_(lead.fecha), safe_(lead.setter), safe_(lead.nombre), safe_(lead.empresa), safe_(lead.cargo),
    safe_(lead.whatsapp), safe_(lead.origen), safe_(lead.codigo),
    Number(lead.rating) || '', Number(lead.score) || '', safe_(lead.veredicto),
    Number(sc.B) || 0, Number(sc.A) || 0, Number(sc.N) || 0, Number(sc.T) || 0,
    safe_((lead.caps || []).join(' | ')),
    safe_(ia && ia.resumen), safe_(ia && ia.siguiente_paso), docUrl
  ]);
}

function boldFirstColumn_(table) {
  for (let i = 0; i < table.getNumRows(); i++) table.getRow(i).getCell(0).editAsText().setBold(true);
}

function createReport_(lead, ia, folder) {
  const title = 'Lead – ' + (lead.empresa || 'Sin empresa') + ' – ' + lead.nombre + ' – ' +
    lead.veredicto + ' (' + lead.rating + '/10) – ' + (lead.fechaCorta || '');
  const doc = DocumentApp.create(title);
  const b = doc.getBody();
  const H1 = DocumentApp.ParagraphHeading.HEADING1, H2 = DocumentApp.ParagraphHeading.HEADING2;

  b.appendParagraph('Informe de calificación de lead · Impulsoee').setHeading(H1);
  b.appendParagraph('Generado por el Calificador BANT el ' + (lead.fecha || '') +
    (lead.setter ? '. Calificado por ' + lead.setter + '.' : '.')).setItalic(true);

  b.appendParagraph('Resultado').setHeading(H2);
  boldFirstColumn_(b.appendTable([
    ['Calificación', lead.rating + ' / 10 (puntaje exacto ' + String(lead.score).replace('.', ',') + ')'],
    ['Veredicto', lead.veredicto || ''],
    ['Acción', lead.accion || '']
  ]));

  if (ia) {
    b.appendParagraph('Análisis de la IA').setHeading(H2);
    if (ia.resumen) b.appendParagraph(ia.resumen);
    (ia.riesgos || []).forEach(r => b.appendListItem(String(r)));
    if (ia.siguiente_paso) b.appendParagraph('Siguiente paso: ' + ia.siguiente_paso);
    if (ia.mensaje_whatsapp) b.appendParagraph('Mensaje sugerido para WhatsApp: ' + ia.mensaje_whatsapp).setItalic(true);
  }

  b.appendParagraph('Datos del lead').setHeading(H2);
  boldFirstColumn_(b.appendTable([
    ['Nombre', lead.nombre || ''], ['Empresa', lead.empresa || ''], ['Cargo', lead.cargo || ''],
    ['WhatsApp', lead.whatsapp || ''], ['Origen', lead.origen || ''], ['Código del anuncio', lead.codigo || '']
  ]));

  b.appendParagraph('Calificación BANT').setHeading(H2);
  const rows = [['Bloque', 'Puntos', 'Respuestas']].concat((lead.bant || []).map(s =>
    [s.bloque, s.puntos, (s.respuestas || []).join('\n')]));
  const t = b.appendTable(rows);
  t.getRow(0).editAsText().setBold(true);

  if ((lead.caps || []).length) {
    b.appendParagraph('Topes aplicados').setHeading(H2);
    lead.caps.forEach(c => b.appendListItem(String(c)));
  }
  if ((lead.notes || []).length) {
    b.appendParagraph('Notas del setter').setHeading(H2);
    lead.notes.forEach(n => b.appendListItem(String(n)));
  }
  if ((lead.improve || []).length) {
    b.appendParagraph('Para mejorar la calificación').setHeading(H2);
    lead.improve.forEach(i => b.appendListItem(String(i)));
  }

  const id = doc.getId(), url = doc.getUrl();
  doc.saveAndClose();
  DriveApp.getFileById(id).moveTo(folder);
  return url;
}
