# Calificador de leads BANT · Impulsoee

Herramienta web para que la setter califique a cada lead con el método BANT. La nota (1 a 10) la calcula la herramienta, la IA de Claude escribe un análisis y un mensaje sugerido, y cada lead queda guardado en el Google Drive de **alvaroingenieriacomercial360@gmail.com**:

- un **Google Doc con el informe resumido** por cada lead, y
- una fila en la **hoja "Base de leads Impulsoee"**, que es la base de datos ordenada de todos los leads.

## Cómo funciona

```
Navegador (setter)
   │  clave de la herramienta (TOOL_PIN)
   ▼
Funciones de Netlify ──► API de Claude (ANTHROPIC_API_KEY): análisis del lead
   │
   └──► Google Apps Script en tu cuenta (APPS_SCRIPT_URL + SECRET)
          ├─ crea el Google Doc del lead en la carpeta "Leads Impulsoee – Calificaciones BANT"
          └─ agrega la fila en la hoja "Base de leads Impulsoee"
```

La API key de Claude y la clave del script nunca llegan al navegador: viven solo en Netlify.

## Contenido de la carpeta

| Archivo | Para qué |
| --- | --- |
| `public/index.html` | La herramienta que usa la setter |
| `netlify/functions/analizar-lead.mjs` | Llama a la API de Claude y devuelve el análisis |
| `netlify/functions/guardar-lead.mjs` | Envía el lead al script de Google |
| `netlify/functions/listar-leads.mjs` | Trae la lista de leads guardados |
| `netlify/lib/comun.mjs` | Funciones comunes (respuestas y clave) |
| `apps-script/Code.gs` | Código para Google Apps Script |
| `netlify.toml` | Configuración de Netlify |

---

## Paso 1. Google Apps Script (en alvaroingenieriacomercial360@gmail.com)

1. Entra a **script.google.com** con la cuenta alvaroingenieriacomercial360@gmail.com y crea un **Nuevo proyecto**. Ponle de nombre "Calificador BANT Impulsoee".
2. Borra el contenido del editor, pega todo el archivo `apps-script/Code.gs` y guarda.
3. Ve a **Configuración del proyecto** (el engranaje) → **Propiedades del script** → **Agregar propiedad**:
   - Nombre: `SECRET`
   - Valor: una clave larga y aleatoria (por ejemplo, 40 caracteres). Guárdala: la vas a usar en Netlify.
4. En el editor, elige la función **`configurar`** y pulsa **Ejecutar**. Google te pedirá permisos para Drive, Documentos y Hojas de cálculo: acéptalos. En el registro de ejecución verás los enlaces de la carpeta y de la hoja que se crearon en tu Drive.
5. Pulsa **Implementar → Nueva implementación**, elige el tipo **Aplicación web** y configura:
   - **Ejecutar como:** Yo (alvaroingenieriacomercial360@gmail.com)
   - **Quién tiene acceso:** Cualquier usuario
6. Pulsa **Implementar** y copia la URL que termina en `/exec`.

"Cualquier usuario" es necesario para que Netlify pueda llamar al script sin iniciar sesión en Google. La protección es la clave `SECRET`: sin ella, el script no hace nada.

Si después cambias `Code.gs`, tienes que publicar una versión nueva: **Implementar → Administrar implementaciones → Editar → Versión: Nueva versión**.

## Paso 2. API de Claude

1. Entra a **console.anthropic.com** y crea una **API key**.
2. En **Billing**, carga créditos (la "recarga de tokens") y define un **límite de gasto** mensual.
3. El modelo por defecto es `claude-haiku-5-5`, que es rápido y económico para este análisis. Si quieres otro, defínelo en la variable `ANTHROPIC_MODEL` (por ejemplo, `claude-sonnet-5-5`).

Documentación de la API: https://docs.claude.com/en/api/overview

## Paso 3. Publicar en Netlify

**Importante:** si arrastras la carpeta a Netlify Drop, se publica solo la página y **las funciones no funcionan**. Usa una de estas dos opciones:

- **Opción A (recomendada): GitHub.** Sube esta carpeta a un repositorio de GitHub. En Netlify: **Add new site → Import an existing project → GitHub** y elige el repositorio. La configuración ya está en `netlify.toml`.
- **Opción B: Netlify CLI.** Con Node instalado: `npm install -g netlify-cli`, luego `netlify login`, `netlify init` y `netlify deploy --prod` dentro de la carpeta.

Después, en **Site configuration → Environment variables**, crea estas variables:

| Variable | Valor |
| --- | --- |
| `ANTHROPIC_API_KEY` | Tu API key de Claude |
| `ANTHROPIC_MODEL` | Opcional. Por defecto `claude-haiku-5-5` |
| `APPS_SCRIPT_URL` | La URL `/exec` del paso 1 |
| `APPS_SCRIPT_SECRET` | La misma clave que pusiste en `SECRET` |
| `TOOL_PIN` | La clave que usará la setter para entrar |

Vuelve a publicar el sitio (**Deploys → Trigger deploy**) para que tome las variables.

## Paso 4. Prueba

1. Abre la URL de Netlify.
2. En **Tu acceso**, escribe tu nombre y el `TOOL_PIN`.
3. Califica un lead de prueba, responde las 9 preguntas y pulsa **Guardar lead y crear informe en Drive**.
4. Debes ver el análisis de la IA, el enlace al informe y el enlace a la hoja de leads. Revisa que el Doc y la fila estén en tu Drive.
5. Borra el lead de prueba de la hoja y el Doc de la carpeta.

## Paso 5. Entregársela a la setter

Envíale la URL de Netlify y, **por WhatsApp o en una llamada**, la clave `TOOL_PIN`. Si la setter deja el cargo, cambia `TOOL_PIN` en Netlify y vuelve a publicar.

---

## Costos y límites

- **Claude:** una llamada por lead guardado, de unos pocos miles de tokens. El gasto se controla con el límite de la consola.
- **Netlify:** las funciones tienen un tiempo máximo por llamada (por defecto, unos 10 segundos). Por eso la IA y Drive se llaman por separado. Si Google tarda demasiado, la herramienta avisa que revises la carpeta antes de volver a guardar, porque el informe puede haberse creado.
- **Google Apps Script:** cuotas diarias de la cuenta gratuita, de sobra para el volumen de leads de la campaña.

## Seguridad y datos personales

- La API key de Claude y la clave `SECRET` solo están en Netlify y en el script, nunca en la página.
- La página exige la clave `TOOL_PIN` para analizar, guardar y ver leads.
- A la IA **no se le envía el número de WhatsApp** del lead.
- Los datos de los leads quedan solo en tu Drive. Mantén la carpeta y la hoja **privadas** y compártelas solo con quien deba verlas. Los leads dieron su autorización de datos en el formulario (Ley 1581 de 2012).
- El script evita que un texto escrito en la herramienta se interprete como fórmula en la hoja.

## Cambiar preguntas o puntos

Las preguntas, los puntos y los topes están al inicio del `<script>` de `public/index.html`, en `SEGMENTS` y `CAPS`. Cámbialos ahí y vuelve a publicar. Si cambias el orden de las columnas de la hoja, ajusta también `HEADERS` en `Code.gs`.
