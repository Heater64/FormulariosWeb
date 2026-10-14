// Artefacto temporal de verificación: escribe dos snapshots (antes / después de
// los retoques del editor) con el marcado real de una tarjeta de pregunta y las
// mismas hojas de estilo que carga index.html, en el mismo orden.
const fs = require('fs');
const path = require('path');

const CSS = [
  '00-settings/_tokens.css', '00-settings/_colores.css', '00-settings/_tipografia.css', '00-settings/_espaciado.css',
  '01-tools/_funciones.css',
  '02-generic/_reset.css',
  '03-elements/_body.css', '03-elements/_heading.css', '03-elements/_paragraph.css', '03-elements/_button.css',
  '03-elements/_input.css', '03-elements/_link.css',
  '04-objects/_contenedor.css', '04-objects/_pila.css', '04-objects/_grid.css', '04-objects/_flecha.css',
  '05-componentes/_boton-primario.css', '05-componentes/_boton-secundario.css', '05-componentes/_boton-enlace.css',
  '05-componentes/_modal.css', '05-componentes/_alerta.css', '05-componentes/_switch.css',
  '05-componentes/_pregunta-examen.css', '05-componentes/_zona-peligro.css',
  '05-componentes/_corregir-examen.css', '05-componentes/_editor-preguntas.css', '05-componentes/_editor-examenes.css',
  '05-componentes/_plataforma.css',
  '06-utilidades/_utilidades.css', '06-utilidades/_colores.css', '06-utilidades/_accesibilidad.css'
];

// Marcado real de la primera pregunta (copiado del DOM en vivo del editor).
const TARJETA = fs.readFileSync(path.join(__dirname, 'tarjeta.html'), 'utf8');

// Revierte SOLO los retoques nuevos, para ver el estado anterior sin tocar el CSS.
const REVERTIR = `
  .adm-pregunta { margin-bottom: var(--espaciado-sm) !important; }
  .adm-pregunta__cabecera { padding-bottom: 0 !important; border-bottom: 0 !important; }
  .adm-pregunta [data-q-accion^="quitar"] { min-width: 0 !important; min-height: 0 !important; padding-inline: var(--espaciado-xs) !important; }
`;

const pagina = (revirtiendo) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tarjeta de pregunta — editor</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
${CSS.map((f) => `<link rel="stylesheet" href="../css/${f}">`).join('\n')}
<style>
  body { background: var(--color-fondo); padding: var(--espaciado-xl) 0; }
  .lienzo { max-width: 700px; margin: 0 auto; }
</style>
${revirtiendo ? `<style>${REVERTIR}</style>` : ''}
</head>
<body>
  <div class="o-contenedor lienzo">
    ${TARJETA}
  </div>
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'snapshot-antes.html'), pagina(true));
fs.writeFileSync(path.join(__dirname, 'snapshot-despues.html'), pagina(false));
console.log('Snapshots escritos en logs/.');
