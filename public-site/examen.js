/* ==============================================================================
 * public-site/examen.js — página pública del alumno (sin cuenta)
 * -----------------------------------------------------------------------------
 * El alumno llega por un enlace individual (/e/<token>). Esta página:
 *   1. valida el enlace contra el servidor (fb_estado_enlace),
 *   2. pide nombre obligatoriamente,
 *   3. inicia/retoma el único intento del enlace (fb_iniciar_por_token),
 *   4. autoguarda el borrador (fb_guardar_borrador_token),
 *   5. entrega y muestra el resultado (fb_entregar_por_token / fb_consultar_entrega).
 *
 * NUNCA decide permisos, notas ni envíos: todo eso lo valida el servidor. Esta
 * página solo pinta lo que las RPCs devuelven, y las RPCs no devuelven
 * respuestas correctas ni notas de otros alumnos.
 *
 * SIN CAMBIOS DISTINTOS A Q1/Q2: el campo grupo ya no se pide ni se envía;
 * cuando el intento está calificado, se muestra el detalle por pregunta del
 * modal de corrección, en modo solo lectura.
 * ==============================================================================*/
(function () {
  'use strict';

  var estado = {
    token: null,
    contexto: null,
    intentoId: null,
    preguntas: [],
    respuestas: {},
    enviando: false,
    guardadoTimer: null,
    comunitario: false,
    nombre: null
  };

  // ── Utilidades ────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }

  function tokenDeUrl() {
    var m = /\/(?:e\/|examen\.html\?t=)([A-Za-z0-9_-]{10,})/.exec(window.location.pathname + window.location.search || '') ||
            /\/(?:e\/|examen\.html\?t=)([A-Za-z0-9_-]{10,})/.exec(window.location.href || '') ||
            /\/e\/([A-Za-z0-9_-]{10,})/.exec(window.location.pathname || '') ||
            /\/e\/([A-Za-z0-9_-]{10,})/.exec(window.location.href || '') ||
            new RegExp('(?:e/|examen\\.html\\?t=)([A-Za-z0-9_-]{10,})').exec(window.location.search || '') ||
            /\/(?:e\/|examen\.html\?t=)([A-Za-z0-9_-]{10,})/.exec(window.location.href || '') ||
            [null, ''];
    return (m && m[1]) ? m[1] : null;
  }

  // PostgREST devuelve el texto del RAISE junto al SQLSTATE. Nos quedamos con la
  // primera línea útil para no mostrar códigos técnicos al alumno.
  function mensajeError(error) {
    if (!error) return 'No se pudo completar la operación.';
    var bruto = error.message || error.details || String(error);
    var lineas = String(bruto).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var util = lineas.filter(function (l) { return !/^[A-Z0-9]{5}$/.test(l); })[0] || 'No se pudo completar la operación.';
    return util.replace(/^(Detalle|Detail|Hint|Error)\s*:\s*/i, '').trim();
  }

  function anunciar(texto) {
    var sr = $('estadoSr');
    if (sr) sr.textContent = texto;
  }

  // Enlace comunitario: la identidad del alumno es su nombre, no un token.
  // rpcEnlace elige la RPC de siempre o la comunitaria que lleva p_nombre.
  function rpcFlujo(rpcIndividual, rpcComunitario, args) {
    if (!estado.comunitario) return rpc(rpcIndividual, args || {});
    var argsConNombre = { p_nombre: estado.nombre };
    var clave;
    for (clave in args || {}) {
      if (Object.prototype.hasOwnProperty.call(args, clave)) argsConNombre[clave] = args[clave];
    }
    return rpc(rpcComunitario, argsConNombre);
  }

  function rpc(nombre, args) {
    var sb = window.supabaseClient;
    if (!sb) return Promise.reject(new Error('No se pudo conectar con el servidor. Recarga la página e inténtalo de nuevo.'));
    return sb.rpc(nombre, args || {}).then(function (res) {
      if (res.error) throw new Error(mensajeError(res.error));
      return res.data;
    });
  }

  // ── Cabecera y progreso ───────────────────────────────────────────────────
  function cabecera(titulo, sub) {
    var nombre = titulo || 'Examen';
    $('cabTitulo').textContent = nombre;
    $('cabSub').textContent = sub || '';
    $('cabEstado').textContent = '';
    document.title = nombre === 'Examen' ? 'Examen' : nombre + ' — Examen';
  }

  // Un error técnico (función ausente, permisos, JWT) nunca debe llegar al
  // alumno: se registra en consola y se muestra un texto comprensible.
  function mensajePublico(mensaje) {
    var texto = String(mensaje || '').trim();
    var tecnico = /schema cache|does not exist|permission denied|JWT|violates|duplicate key|syntax error|relation "/i.test(texto);
    if (!texto || tecnico) {
      console.warn('[examen] error técnico:', texto);
      return 'No hemos podido abrir el enlace. Pide a tu profesor que te lo envíe de nuevo.';
    }
    return texto;
  }

  // La píldora «Instala la app» se muestra al entrar y al terminar el examen
  // (y en los avisos de la misma entrada), y se oculta mientras se responde
  // para no molestar. Vive en #zonaPill, fuera del #lienzo que se repinta.
  function verPill(visible) {
    var zona = $('zonaPill');
    if (zona) zona.hidden = !visible;
  }

  function progreso(fraccion) {
    var barra = $('progresoBarra');
    if (!barra) return;
    var pct = Math.max(0, Math.min(100, Math.round(fraccion * 100)));
    barra.style.width = pct + '%';
  }

  // ── Pantallas ─────────────────────────────────────────────────────────────
  function pantallaMensaje(opciones) {
    verPill(true);
    var lienzo = $('lienzo');
    lienzo.className = 'lienzo lienzo--estrecho lienzo--centrado';
    lienzo.innerHTML = '';
    var tarjeta = el('section', 'tarjeta');
    tarjeta.appendChild(el('div', 'tarjeta__icono' + (opciones.error ? ' tarjeta__icono--error' : ''), opciones.icono || '!'));
    tarjeta.appendChild(el('h1', null, opciones.titulo));
    if (opciones.texto) tarjeta.appendChild(el('p', 'sub', opciones.texto));
    if (opciones.extra) tarjeta.appendChild(opciones.extra);
    lienzo.appendChild(tarjeta);
    progreso(0);
  }

  // Temario de estudio publicado (fase 2): el servidor solo lo entrega si el
  // profesor lo publicó y la bandera está activa. Se pinta como <details>
  // nativo, antes del aviso de entrega única, para que el alumno pueda
  // repasarlo antes de empezar.
  function refATexto(ref) {
    if (!ref || !ref.libro) return '';
    var salida = String(ref.libro);
    if (ref.capitulo != null) salida += ' ' + ref.capitulo;
    if (ref.versiculos) salida += ':' + ref.versiculos;
    if (ref.capitulo_fin != null) {
      salida += '-' + ref.capitulo_fin;
      if (ref.versiculos_fin) salida += ':' + ref.versiculos_fin;
    }
    return salida;
  }

  function bloqueTemario(temario) {
    var items = (temario && Object.prototype.toString.call(temario.items) === '[object Array]')
      ? temario.items.slice().sort(function (a, b) {
          return (parseInt(a && a.orden, 10) || 0) - (parseInt(b && b.orden, 10) || 0);
        })
      : [];
    if (!items.length) return null;

    var cont = el('details', 'temario');
    cont.appendChild(el('summary', 'temario__cabecera',
      'Temario de estudio (' + items.length + ' elemento' + (items.length === 1 ? '' : 's') + ')'));
    var lista = el('ol', 'temario__lista');
    items.forEach(function (item) {
      var li = el('li', 'temario__item');
      var refs = ((item && item.refs) || []).map(refATexto).filter(Boolean);
      if (refs.length) li.appendChild(el('span', 'temario__ref', refs.join(' · ')));
      li.appendChild(document.createTextNode((item && item.texto) || ''));
      lista.appendChild(li);
    });
    cont.appendChild(lista);
    return cont;
  }

  function pantallaIntroduccion(ctx) {
    verPill(true);
    var lienzo = $('lienzo');
    lienzo.className = 'lienzo lienzo--estrecho';
    lienzo.innerHTML = '';

    var tarjeta = el('section', 'tarjeta');
    tarjeta.appendChild(el('h1', null, ctx.titulo || 'Examen'));

    var meta = el('div', 'meta');
    if (ctx.total_preguntas) meta.appendChild(el('span', 'chip', ctx.total_preguntas + ' preguntas'));
    if (ctx.puntos_totales) meta.appendChild(el('span', 'chip', ctx.puntos_totales + ' puntos'));
    if (ctx.profesor) meta.appendChild(el('span', 'chip', ctx.profesor));
    tarjeta.appendChild(meta);

    if (ctx.descripcion) {
      var desc = el('p', 'sub', ctx.descripcion);
      desc.style.whiteSpace = 'pre-wrap';
      tarjeta.appendChild(desc);
    }

    var temario = bloqueTemario(ctx.temario);
    if (temario) tarjeta.appendChild(temario);

    var aviso = el('div', 'aviso aviso--warn');
    aviso.appendChild(el('strong', null, 'Antes de empezar: '));
    aviso.appendChild(document.createTextNode(
      'solo puedes entregar este examen una vez. Comprueba tus respuestas antes de enviar.'
    ));
    tarjeta.appendChild(aviso);

    if (ctx.comunitario) {
      var avisoComunitario = el('div', 'aviso aviso--error');
      avisoComunitario.appendChild(el('strong', null, 'Este enlace es público. '));
      avisoComunitario.appendChild(document.createTextNode('Escribe tu nombre para identificarte antes de responder.'));
      avisoComunitario.appendChild(document.createTextNode(' Responderás y, cuando lo hayas entregado, podrás revisar tu examen en este mismo enlace.'));
      avisoComunitario.appendChild(document.createTextNode(' Para revisar tu nota tendrás que escribir exactamente el mismo nombre con el que respondas.'));
      tarjeta.appendChild(avisoComunitario);
    }

    var form = el('form');
    form.setAttribute('novalidate', '');

    var campoNombre = el('div', 'campo');
    var etiquetaNombre = el('label', null, 'Tu nombre');
    etiquetaNombre.setAttribute('for', 'nombreAlumno');
    campoNombre.appendChild(etiquetaNombre);
    var inputNombre = el('input');
    inputNombre.type = 'text';
    inputNombre.id = 'nombreAlumno';
    inputNombre.name = 'nombre';
    inputNombre.autocomplete = 'name';
    inputNombre.maxLength = 120;
    inputNombre.required = true;
    // En el enlace de la clase el nombre no lo da el servidor: se recuerda el
    // último con el que este dispositivo identificó a un alumno (editable).
    inputNombre.value = nombreRecordado() || ctx.nombre_alumno || '';
    campoNombre.appendChild(inputNombre);
    form.appendChild(campoNombre);

    var error = el('div', 'aviso aviso--error oculto');
    error.setAttribute('role', 'alert');
    form.appendChild(error);

    var btn = el('button', 'btn', 'Comenzar examen');
    btn.type = 'submit';
    form.appendChild(btn);
    tarjeta.appendChild(form);

    var errorId = 'errIntro';
    error.id = errorId;
    inputNombre.setAttribute('aria-describedby', errorId);

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var nombre = inputNombre.value.trim();
      if (nombre.length < 2) {
        error.textContent = 'Escribe tu nombre para continuar.';
        error.classList.remove('oculto');
        inputNombre.focus();
        return;
      }
      error.classList.add('oculto');
      btn.disabled = true;
      btn.textContent = 'Abriendo examen…';
      if (estado.comunitario) recordarNombre(nombre);
      iniciar(nombre);
    });

    lienzo.appendChild(tarjeta);
    inputNombre.focus();
  }

  // ── Examen ────────────────────────────────────────────────────────────────
  function esObjetiva(pregunta) {
    return ['multiple', 'opcion_unica', 'verdadero_falso'].indexOf(pregunta.tipo) >= 0;
  }

  function opcionesDe(pregunta) {
    if (Array.isArray(pregunta.opciones)) return pregunta.opciones;
    if (pregunta.opciones && typeof pregunta.opciones === 'object') {
      // Compatibilidad con formatos antiguos que guardaban listas nombradas.
      var salida = [];
      ['a', 'b', 'c', 'd', 'e', 'f'].forEach(function (k) {
        if (pregunta.opciones[k]) salida.push(pregunta.opciones[k]);
      });
      return salida;
    }
    return [];
  }

  function mezclaEstable(id, n) {
    var orden = [];
    var i;
    for (i = 0; i < n; i++) orden.push(i);
    var semilla = 2166136261;
    var texto = String(id || '');
    for (i = 0; i < texto.length; i++) {
      semilla ^= texto.charCodeAt(i);
      semilla = (semilla * 16777619) >>> 0;
    }
    for (i = n - 1; i > 0; i--) {
      semilla = (semilla * 1664525 + 1013904223) >>> 0;
      var j = semilla % (i + 1);
      var tmp = orden[i];
      orden[i] = orden[j];
      orden[j] = tmp;
    }
    if (n > 1 && orden.every(function (v, k) { return v === k; })) orden.push(orden.shift());
    return orden;
  }

  function estaRespondida(id) {
    var valor = estado.respuestas[id];
    if (valor === undefined || valor === null) return false;
    if (typeof valor === 'string') return valor.trim() !== '';
    if (Array.isArray(valor)) {
      var conValor = valor.filter(function (v) { return String(v == null ? '' : v).trim() !== ''; });
      if (!conValor.length) return false;
      var soloNumeros = valor.every(function (v) { return typeof v === 'number'; });
      return soloNumeros ? true : conValor.length === valor.length;
    }
    if (typeof valor === 'object') {
      var claves = Object.keys(valor);
      return claves.length > 0 && claves.every(function (k) { return typeof valor[k] === 'number'; });
    }
    return true;
  }

  function renderPreguntas() {
    verPill(false);
    var lienzo = $('lienzo');
    lienzo.className = 'lienzo';
    lienzo.innerHTML = '';

    var tarjeta = el('section', 'tarjeta');
    estado.preguntas.forEach(function (pregunta, indice) {
      tarjeta.appendChild(renderPregunta(pregunta, indice));
    });
    lienzo.appendChild(tarjeta);

    var barra = el('div', 'barra-envio');
    var info = el('div', 'barra-envio__info');
    var punto = el('span', 'punto-guardado');
    punto.id = 'puntoGuardado';
    var textoInfo = el('span');
    textoInfo.id = 'textoProgreso';
    info.appendChild(punto);
    info.appendChild(textoInfo);
    barra.appendChild(info);

    var acciones = el('div', 'barra-envio__acciones');
    var btn = el('button', 'btn', 'Entregar examen');
    btn.type = 'button';
    btn.id = 'btnEntregar';
    btn.addEventListener('click', confirmarEnvio);
    acciones.appendChild(btn);
    barra.appendChild(acciones);

    document.body.appendChild(barra);
    actualizarProgreso();
    actualizarEstadoGuardado('Los borradores se guardan solos');
  }

  function renderPregunta(pregunta, indice) {
    var cont = el('article', 'pregunta');
    cont.dataset.preguntaId = pregunta.id;

    var cab = el('div', 'pregunta__cabecera');
    cab.appendChild(el('span', 'pregunta__numero', 'Pregunta ' + (indice + 1)));
    cab.appendChild(el('span', 'pregunta__puntos', (Number(pregunta.puntos) || 1) + ' pt'));
    cont.appendChild(cab);

    var texto = el('div', 'pregunta__texto');
    // En "completar" el enunciado lleva marcadores {0}, {1}…: se pintan como
    // huecos numerados para que enlacen con los campos "Hueco 1", "Hueco 2".
    texto.appendChild(document.createTextNode(marcarHuecos(pregunta.texto || ('Pregunta ' + (indice + 1)))));
    if (pregunta.obligatoria) {
      var marca = el('span', 'pregunta__obligatoria');
      marca.textContent = ' *';
      marca.setAttribute('aria-hidden', 'false');
      texto.appendChild(marca);
    }
    cont.appendChild(texto);

    var actualizar = function () {
      marcarRespondida(cont, pregunta);
      actualizarProgreso();
      programarGuardado();
    };

    var tipo = pregunta.tipo || 'multiple';
    if (tipo === 'varias_opciones') renderVarias(cont, pregunta, actualizar);
    else if (esObjetiva(pregunta)) renderOpciones(cont, pregunta, indice, actualizar);
    else if (tipo === 'completar') renderCompletar(cont, pregunta, actualizar);
    else if (tipo === 'respuesta_corta') renderRespuestaCorta(cont, pregunta, actualizar);
    else if (tipo === 'relacionar') renderRelacionar(cont, pregunta, actualizar);
    else if (tipo === 'ordenar') renderOrdenar(cont, pregunta, actualizar);
    else renderDesarrollo(cont, pregunta, actualizar);

    if (!estaRespondida(pregunta.id)) cont.classList.add('pregunta--sin-responder');
    return cont;
  }

  function renderOpciones(cont, pregunta, indice, actualizar) {
    var opciones = opcionesDe(pregunta);
    if (!opciones.length && pregunta.tipo === 'verdadero_falso') opciones = ['Verdadero', 'Falso'];
    var fs = el('fieldset');
    var leyenda = el('legend', 'u-solo-lectores-pantalla', 'Pregunta ' + (indice + 1) + (pregunta.obligatoria ? ' (obligatoria)' : ' (opcional)'));
    fs.appendChild(leyenda);
    var lista = el('div', 'opciones');
    opciones.forEach(function (opcion, i) {
      var valor = String(i);
      var label = el('label', 'opcion');
      var input = el('input');
      input.type = 'radio';
      input.name = 'p_' + pregunta.id;
      input.value = valor;
      input.checked = String(estado.respuestas[pregunta.id]) === valor;
      var span = el('span', 'opcion__texto', String(opcion));
      label.appendChild(input);
      label.appendChild(span);
      input.addEventListener('change', function () {
        estado.respuestas[pregunta.id] = valor;
        actualizar();
      });
      lista.appendChild(label);
    });
    fs.appendChild(lista);
    cont.appendChild(fs);
    if (!opciones.length) {
      cont.appendChild(el('div', 'aviso aviso--error', 'Esta pregunta no tiene opciones configuradas. Avisa a tu profesor.'));
    }
  }

  function renderVarias(cont, pregunta, actualizar) {
    var opciones = opcionesDe(pregunta);
    var guardadas = Array.isArray(estado.respuestas[pregunta.id]) ? estado.respuestas[pregunta.id] : [];
    var fs = el('fieldset');
    fs.appendChild(el('legend', 'u-solo-lectores-pantalla', 'Marca todas las opciones que correspondan'));
    var lista = el('div', 'opciones');
    opciones.forEach(function (opcion, i) {
      var label = el('label', 'opcion');
      var input = el('input');
      input.type = 'checkbox';
      input.name = 'p_' + pregunta.id;
      input.value = String(i);
      input.checked = guardadas.indexOf(i) >= 0;
      label.appendChild(input);
      label.appendChild(el('span', 'opcion__texto', String(opcion)));
      input.addEventListener('change', function () {
        var marcadas = [];
        Array.prototype.forEach.call(lista.querySelectorAll('input[type="checkbox"]'), function (c) {
          if (c.checked) marcadas.push(Number(c.value));
        });
        estado.respuestas[pregunta.id] = marcadas;
        actualizar();
      });
      lista.appendChild(label);
    });
    fs.appendChild(lista);
    cont.appendChild(fs);
    if (!opciones.length) {
      cont.appendChild(el('div', 'aviso aviso--error', 'Esta pregunta no tiene opciones configuradas. Avisa a tu profesor.'));
    }
  }

  function renderCompletar(cont, pregunta, actualizar) {
    var huecos = Array.isArray(pregunta.huecos) ? pregunta.huecos : [];
    if (!huecos.length) {
      textoSimple(cont, pregunta, 'Escribe la palabra que falta…', actualizar);
      return;
    }
    var guardadas = Array.isArray(estado.respuestas[pregunta.id]) ? estado.respuestas[pregunta.id] : [];
    huecos.forEach(function (hueco, i) {
      var idCampo = 'h_' + pregunta.id + '_' + i;
      var etiqueta = el('label', 'pregunta__etiqueta', 'Hueco ' + (i + 1));
      etiqueta.setAttribute('for', idCampo);
      cont.appendChild(etiqueta);
      var input = el('input');
      input.type = 'text';
      input.id = idCampo;
      input.name = idCampo;
      input.autocomplete = 'off';
      input.maxLength = 200;
      input.value = typeof guardadas[i] === 'string' ? guardadas[i] : '';
      input.addEventListener('input', function () {
        var respuestas = estado.respuestas[pregunta.id];
        if (!Array.isArray(respuestas) || respuestas.length !== huecos.length) {
          respuestas = huecos.map(function () { return ''; });
        }
        respuestas[i] = input.value;
        estado.respuestas[pregunta.id] = respuestas;
        actualizar();
      });
      cont.appendChild(input);
    });
  }

  function renderRespuestaCorta(cont, pregunta, actualizar) {
    textoSimple(cont, pregunta, 'Escribe tu respuesta en una línea…', actualizar);
  }

  function textoSimple(cont, pregunta, placeholder, actualizar) {
    var idCampo = 'a_' + pregunta.id;
    var etiqueta = el('label', 'pregunta__etiqueta', 'Tu respuesta');
    etiqueta.setAttribute('for', idCampo);
    cont.appendChild(etiqueta);
    var input = el('input');
    input.type = 'text';
    input.id = idCampo;
    input.name = 'a_' + pregunta.id;
    input.autocomplete = 'off';
    input.maxLength = 200;
    input.value = typeof estado.respuestas[pregunta.id] === 'string' ? estado.respuestas[pregunta.id] : '';
    input.placeholder = placeholder;
    input.addEventListener('input', function () {
      estado.respuestas[pregunta.id] = input.value;
      actualizar();
    });
    cont.appendChild(input);
  }

  function renderRelacionar(cont, pregunta, actualizar) {
    var opciones = opcionesDe(pregunta);
    var mitad = Math.floor(opciones.length / 2);
    var izquierda = opciones.slice(0, mitad);
    var derecha = opciones.slice(mitad);
    var orden = mezclaEstable(pregunta.id, derecha.length);
    var previa = estado.respuestas[pregunta.id];
    var guardado = (previa && typeof previa === 'object' && !Array.isArray(previa)) ? previa : {};

    var fs = el('fieldset');
    fs.appendChild(el('legend', 'u-solo-lectores-pantalla', 'Relaciona cada elemento de la izquierda con su pareja'));
    var lista = el('div', 'relacionar');
    var selects = [];
    izquierda.forEach(function (textoIzq, i) {
      var fila = el('div', 'relacionar__fila');
      fila.appendChild(el('span', 'relacionar__texto', String(textoIzq)));
      var idCampo = 'r_' + pregunta.id + '_' + i;
      var etiqueta = el('label', 'u-solo-lectores-pantalla', 'Pareja de «' + String(textoIzq) + '»');
      etiqueta.setAttribute('for', idCampo);
      fila.appendChild(etiqueta);
      var select = el('select');
      select.id = idCampo;
      select.name = idCampo;
      var vacio = el('option', null, 'Elige la pareja…');
      vacio.value = '';
      select.appendChild(vacio);
      orden.forEach(function (indiceDer) {
        var op = el('option', null, String(derecha[indiceDer]));
        op.value = String(indiceDer);
        select.appendChild(op);
      });
      if (guardado[i] != null && guardado[i] !== '') select.value = String(guardado[i]);
      selects.push(select);
      fila.appendChild(select);
      lista.appendChild(fila);
    });
    fs.appendChild(lista);
    cont.appendChild(fs);

    var jugadorRelacionar = function () {
      // Guardar SIEMPRE: este manejador es el único sitio donde la respuesta de
      // «relacionar» pasa a estado.respuestas. Cualquier referencia a variables
      // inexistentes aquí (restos de una navegación por preguntas ya retirada)
      // lanzaba ReferenceError antes de guardar: la pregunta se quedaba marcada
      // como «sin responder» y, siendo obligatoria, bloqueaba la entrega.
      guardarMapaParejas(lista, pregunta, actualizar);
    };
    selects.forEach(function (select) {
      select.addEventListener('change', jugadorRelacionar);
      select.addEventListener('input', jugadorRelacionar);
    });

    if (mitad < 2) {
      cont.appendChild(el('div', 'aviso aviso--error', 'Esta pregunta no tiene parejas configuradas. Avisa a tu profesor.'));
    }
  }

  function renderOrdenar(cont, pregunta, actualizar) {
    var opciones = opcionesDe(pregunta);
    var previa = estado.respuestas[pregunta.id];
    var guardado = (Array.isArray(previa) && previa.length === opciones.length)
      ? previa.slice()
      : mezclaEstable(pregunta.id, opciones.length);

    var lista = el('div', 'ordenar');
    cont.appendChild(lista);

    var pintar = function () {
      lista.innerHTML = '';
      guardado.forEach(function (indiceOriginal, posicion) {
        var fila = el('div', 'ordenar__fila');
        fila.appendChild(el('span', 'ordenar__pos', String(posicion + 1) + '.'));
        fila.appendChild(el('span', 'ordenar__texto', String(opciones[indiceOriginal])));
        var acciones = el('div', 'ordenar__acciones');

        var subir = el('button', 'ordenar__btn', '▲');
        subir.type = 'button';
        subir.setAttribute('aria-label', 'Subir «' + String(opciones[indiceOriginal]) + '» a la posición ' + posicion);
        subir.disabled = posicion === 0;
        subir.addEventListener('click', function () {
          var anterior = guardado[posicion - 1];
          guardado[posicion - 1] = indiceOriginal;
          guardado[posicion] = anterior;
          estado.respuestas[pregunta.id] = guardado.slice();
          pintar();
          actualizar();
        });

        var bajar = el('button', 'ordenar__btn', '▼');
        bajar.type = 'button';
        bajar.setAttribute('aria-label', 'Bajar «' + String(opciones[indiceOriginal]) + '» a la posición ' + (posicion + 2));
        bajar.disabled = posicion === guardado.length - 1;
        bajar.addEventListener('click', function () {
          var siguiente = guardado[posicion + 1];
          guardado[posicion + 1] = indiceOriginal;
          guardado[posicion] = siguiente;
          estado.respuestas[pregunta.id] = guardado.slice();
          pintar();
          actualizar();
        });

        acciones.appendChild(subir);
        acciones.appendChild(bajar);
        fila.appendChild(acciones);
        lista.appendChild(fila);
      });
    };
    pintar();

    if (opciones.length < 2) {
      cont.appendChild(el('div', 'aviso aviso--error', 'Esta pregunta no tiene elementos configurados. Avisa a tu profesor.'));
    }
  }

  function renderDesarrollo(cont, pregunta, actualizar) {
    var idArea = 'a_' + pregunta.id;
    var etiqueta = el('label', 'pregunta__etiqueta', 'Tu respuesta');
    etiqueta.setAttribute('for', idArea);
    cont.appendChild(etiqueta);
    var area = el('textarea');
    area.id = idArea;
    area.name = 'a_' + pregunta.id;
    area.rows = 6;
    area.value = typeof estado.respuestas[pregunta.id] === 'string' ? estado.respuestas[pregunta.id] : '';
    area.placeholder = 'Escribe tu respuesta…';
    area.addEventListener('input', function () {
      estado.respuestas[pregunta.id] = area.value;
      actualizar();
    });
    cont.appendChild(area);
  }

  function marcarRespondida(contenedor, pregunta) {
    contenedor.classList.toggle('pregunta--sin-responder', !estaRespondida(pregunta.id));
  }

  function actualizarProgreso() {
    var total = estado.preguntas.length;
    var respondidas = estado.preguntas.filter(function (p) { return estaRespondida(p.id); }).length;
    progreso(total ? respondidas / total : 0);
    var texto = $('textoProgreso');
    if (texto) texto.textContent = respondidas + ' de ' + total + ' respondidas';
    var estado_cab = $('cabEstado');
    if (estado_cab) estado_cab.textContent = respondidas + '/' + total;
  }

  // ── Autoguardado ──────────────────────────────────────────────────────────
  function actualizarEstadoGuardado(texto, guardado) {
    var punto = $('puntoGuardado');
    if (punto) punto.classList.toggle('punto-guardado--on', !!guardado);
    var texto2 = $('textoProgreso');
    if (texto2 && texto && !/respondidas$/.test(texto2.textContent)) texto2.textContent = texto;
  }

  function programarGuardado() {
    if (!estado.intentoId) return;
    clearTimeout(estado.guardadoTimer);
    actualizarEstadoGuardado('Guardando…', false);
    estado.guardadoTimer = setTimeout(function () {
      rpcFlujo('fb_guardar_borrador_token', 'fb_comunitario_borrador', { p_token: estado.token, p_respuestas: estado.respuestas })
        .then(function () { actualizarEstadoGuardado('Borrador guardado', true); })
        .catch(function () { actualizarEstadoGuardado('Sin conexión: reintentaremos', false); });
    }, 900);
  }

  // ── Confirmación y entrega ────────────────────────────────────────────────
  function confirmarEnvio() {
    if (estado.enviando) return;
    var pendientes = estado.preguntas.filter(function (p) { return !estaRespondida(p.id); });
    var obligatoriasVacias = pendientes.filter(function (p) { return p.obligatoria; });

    var dialogo = el('dialog');
    dialogo.className = 'tarjeta';
    dialogo.style.border = '1px solid var(--b)';
    dialogo.style.maxWidth = '440px';
    dialogo.style.margin = 'auto';
    dialogo.appendChild(el('h2', null, '¿Entregar el examen?'));

    var detalle = el('p', 'sub');
    detalle.style.marginTop = '10px';
    if (pendientes.length === 0) {
      detalle.textContent = 'Has respondido todas las preguntas. Después de entregar no podrás modificarlas.';
    } else {
      detalle.textContent = 'Te quedan ' + pendientes.length + ' pregunta(s) sin responder'
        + (obligatoriasVacias.length ? ', ' + obligatoriasVacias.length + ' de ellas obligatoria(s)' : '')
        + '. Después de entregar no podrás modificarlas.';
    }
    dialogo.appendChild(detalle);

    if (obligatoriasVacias.length) {
      dialogo.appendChild(el('div', 'aviso aviso--error', 'Debes responder las preguntas obligatorias antes de entregar.'));
    }

    var error = el('div', 'aviso aviso--error oculto');
    error.setAttribute('role', 'alert');
    dialogo.appendChild(error);

    var fila = el('div');
    fila.style.display = 'flex';
    fila.style.gap = '10px';
    fila.style.marginTop = 'var(--md)';

    var cancelar = el('button', 'btn btn--secundario', 'Seguir revisando');
    cancelar.type = 'button';
    cancelar.addEventListener('click', function () { dialogo.close(); dialogo.remove(); });

    var enviar = el('button', 'btn', 'Sí, entregar');
    enviar.type = 'button';
    if (obligatoriasVacias.length) enviar.disabled = true;
    enviar.addEventListener('click', function () {
      enviar.disabled = true;
      enviar.textContent = 'Entregando…';
      entregar().then(function () {
        if (dialogo.open) dialogo.close();
        dialogo.remove();
      }).catch(function (e) {
        enviar.disabled = false;
        enviar.textContent = 'Sí, entregar';
        error.textContent = e.message;
        error.classList.remove('oculto');
      });
    });

    fila.appendChild(cancelar);
    fila.appendChild(enviar);
    dialogo.appendChild(fila);
    document.body.appendChild(dialogo);
    dialogo.showModal();
    cancelar.focus();
  }

  // Mapa de parejas (relacionar): se guarda el mapa completo para que la
  // obligatoriedad de esta pregunta equivalga a completar todas las parejas.
  function guardarMapaParejas(lista, pregunta, actualizar) {
    var mapa = {};
    var completo = true;
    var selects = lista.querySelectorAll('select');
    selects.forEach(function (select, i) {
      if (select.value === '') { completo = false; return; }
      mapa[i] = Number(select.value);
    });
    if (completo) estado.respuestas[pregunta.id] = mapa; else delete estado.respuestas[pregunta.id];
    actualizar();
  }

  function quitarBarra() {
    var barra = document.querySelector('.barra-envio');
    if (barra) barra.remove();
  }

  function entregar() {
    if (estado.enviando) return Promise.reject(new Error('Ya se está entregando.'));
    estado.enviando = true;
    var btn = $('btnEntregar');
    if (btn) { btn.disabled = true; btn.textContent = 'Entregando…'; }
    clearTimeout(estado.guardadoTimer);

    return rpcFlujo('fb_entregar_por_token', 'fb_comunitario_entregar', { p_token: estado.token, p_respuestas: estado.respuestas })
      .then(function (res) {
        quitarBarra();
        anunciar('Examen entregado correctamente.');
        pantallaEntregado(res);
      })
      .catch(function (e) {
        estado.enviando = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Entregar examen'; }
        throw e;
      });
  }

  function pantallaEntregado(res) {
    var pendientes = Number(res && res.pendientes_correccion) || 0;
    var extra = el('div');
    if (pendientes > 0) {
      var aviso = el('div', 'aviso aviso--warn');
      aviso.appendChild(el('strong', null, 'Entrega registrada. '));
      aviso.appendChild(document.createTextNode(
        'Hay ' + pendientes + ' respuesta(s) escrita(s) que tu profesor debe corregir. '
        + 'La nota final aparecerá en este mismo enlace cuando termine la corrección.'
      ));
      extra.appendChild(aviso);
    } else {
      var ok = el('div', 'aviso aviso--ok');
      ok.appendChild(el('strong', null, 'Entrega registrada. '));
      ok.appendChild(document.createTextNode('Tu profesor publicará la nota en este enlace.'));
      extra.appendChild(ok);
    }
    var nota = el('p', 'pie-nota', 'Puedes cerrar esta pestaña. Guarda el enlace para consultar tu resultado.');
    extra.appendChild(nota);
    extra.style.marginTop = 'var(--md)';

    pantallaMensaje({
      icono: '✓',
      titulo: '¡Examen entregado!',
      texto: 'Gracias, ' + (estado.contexto && estado.contexto.nombre_alumno ? estado.contexto.nombre_alumno : 'alumno') + '.',
      extra: extra
    });
  }

  function pantallaResultado(res) {
    var estadoResultado = res.estado;
    var preguntasSnapshot = (res.preguntas && Array.isArray(res.preguntas)) ? res.preguntas : null;
    var correccion = res.correccion || {};
    var preguntasParaMostrar = estadoResultado === 'calificado' && preguntasSnapshot ? preguntasSnapshot : null;
    var detallePorPregunta = estadoResultado === 'calificado' && res.detalle && res.detalle.por_pregunta ? res.detalle.por_pregunta : null;
    var extra = el('div');

    if (estadoResultado === 'calificado') {
      var marca = el('div', 'nota-marca');
      var valorNota = el('span', 'nota-marca__nota', formatearNota(res.nota || 0));
      marca.appendChild(valorNota);
      var sobre = el('span', 'nota-marca__sobre', 'sobre 10');
      marca.appendChild(sobre);
      extra.appendChild(marca);

      var lista = el('ul', 'nota-detalle');
      var filaPct = el('li', 'nota-detalle__item');
      filaPct.appendChild(el('span', 'nota-detalle__key', 'Aciertos'));
      filaPct.appendChild(el('strong', 'nota-detalle__val', Math.round(Number(res.puntuacion || 0)) + ' %'));
      lista.appendChild(filaPct);
      extra.appendChild(lista);

      if (detallePorPregunta && preguntasParaMostrar) {
        var preguntasDetalle = el('section', 'nota-preguntas');
        preguntasDetalle.appendChild(el('h2', 'nota-preguntas__titulo', 'Tu resultado por pregunta'));
        preguntasParaMostrar.forEach(function (pregunta, idx) {
          var detalle = detallePorPregunta[pregunta.id] || {};
          var correctaGlobal = detalle.es_correcta === true;
          var puntosObtenidos = detalle.puntos != null ? Number(detalle.puntos) : 0;
          var maxPuntos = Number(pregunta.puntos) || 1;
          var bloque = el('article', 'nota-pregunta');
          var cab = el('header', 'nota-pregunta__cabecera');
          cab.appendChild(el('span', 'nota-pregunta__n', 'Pregunta ' + (idx + 1)));
          if (pregunta.obligatoria) cab.appendChild(el('span', 'nota-pregunta__oblig', 'Obligatoria'));
          var marcaPreg = el('span', 'nota-pregunta__marca' + (correctaGlobal ? ' nota-pregunta__marca--ok' : ' nota-pregunta__marca--mal'), correctaGlobal ? '✓' : '✗');
          cab.appendChild(marcaPreg);
          cab.appendChild(el('span', 'nota-pregunta__pts', maxPuntos + ' pt'));
          bloque.appendChild(cab);

          var enunciado = el('p', 'nota-pregunta__enunciado');
          // En "completar" el enunciado lleva marcadores {0}, {1}…: aquí no
          // hay inputs, así que se pintan numerados como en el examen.
          var textoEnunciado = marcarHuecos(pregunta.texto || ('Pregunta ' + (idx + 1)));
          enunciado.appendChild(document.createTextNode(textoEnunciado));
          bloque.appendChild(enunciado);

          var respuestaAlumno = extraerRespuestaAlumno(detalle.respuesta_alumno, pregunta);
          // El servidor manda la respuesta correcta en crudo (índice, JSON…):
          // se traduce a texto igual que la del alumno para poder compararlas.
          var respuestaCorrecta = detalle.respuesta_correcta != null
            ? extraerRespuestaAlumno(detalle.respuesta_correcta, pregunta)
            : null;

          var cuerpo = el('div', 'nota-pregunta__cuerpo');
          var filaRespuesta = el('div', 'nota-pregunta__respuesta');
          filaRespuesta.appendChild(el('span', 'nota-pregunta__label', 'Tu respuesta:'));
          filaRespuesta.appendChild(el('span', 'nota-pregunta__valor', respuestaAlumno));
          cuerpo.appendChild(filaRespuesta);

          if (respuestaCorrecta != null) {
            var filaCorrecta = el('div', 'nota-pregunta__respuesta' + (correctaGlobal ? ' nota-pregunta__respuesta--correcta' : ''));
            filaCorrecta.appendChild(el('span', 'nota-pregunta__label', 'Respuesta correcta:'));
            filaCorrecta.appendChild(el('span', 'nota-pregunta__valor', respuestaCorrecta));
            cuerpo.appendChild(filaCorrecta);
          }

          // Los puntos siempre los decide el servidor (incluido el parcial
          // de "completar"), así que se pinta tal cual, no "0".
          var filaPuntos = el('div', 'nota-pregunta__puntos' + (puntosObtenidos >= maxPuntos ? ' nota-pregunta__puntos--ok' : ''));
          filaPuntos.appendChild(el('span', 'nota-pregunta__label', 'Puntos:'));
          var puntosFinales = el('span', 'nota-pregunta__valor');
          puntosFinales.appendChild(el('strong', null, formatearNota(puntosObtenidos)));
          puntosFinales.appendChild(el('span', 'nota-pregunta__max', ' / ' + maxPuntos));
          filaPuntos.appendChild(puntosFinales);
          cuerpo.appendChild(filaPuntos);
          bloque.appendChild(cuerpo);

          if (detalle.comentario) {
            var obs = el('div', 'nota-pregunta__comentario');
            obs.appendChild(el('strong', null, 'Comentario del profesor: '));
            obs.appendChild(document.createTextNode(detalle.comentario));
            bloque.appendChild(obs);
          }

          preguntasDetalle.appendChild(bloque);
        });
        extra.appendChild(preguntasDetalle);
      }

      if (res.observaciones) {
        var obsGlobal = el('div', 'nota-observaciones');
        obsGlobal.appendChild(el('strong', null, 'Comentario del profesor: '));
        obsGlobal.appendChild(document.createTextNode(res.observaciones));
        extra.appendChild(obsGlobal);
      }

      extra.style.marginTop = 'var(--md)';
      pantallaMensaje({ icono: '✓', titulo: 'Resultado', texto: res.titulo || 'Examen', extra: extra });
      var lienzo = $('lienzo');
      lienzo.classList.remove('lienzo--estrecho', 'lienzo--centrado');
      lienzo.classList.add('lienzo--correccion');
    } else {
      var aviso = el('div', 'aviso aviso--warn');
      aviso.appendChild(el('strong', null, 'Entrega registrada. '));
      aviso.appendChild(document.createTextNode(
        res.pendiente_correccion
          ? 'Quedan ' + res.pendiente_correccion + ' respuesta(s) por corregir. La nota final aparecerá aquí.'
          : 'La nota final aparecerá aquí cuando tu profesor termine la corrección.'
      ));
      extra.appendChild(aviso);
      extra.appendChild(el('p', 'pie-nota', 'Vuelve a este mismo enlace: la nota y el detalle aparecerán aquí solos.'));
      extra.style.marginTop = 'var(--md)';
      pantallaMensaje({ icono: '⏳', titulo: 'Pendiente de corrección', texto: res.titulo || 'Examen', extra: extra });
    }
  }

  // Un marcador {0} en el enunciado debe leerse junto al campo "Hueco 1":
  // se dibuja numerado en vez de dejar la llave literal en pantalla.
  function marcarHuecos(texto) {
    return String(texto || '').replace(/\{(\d+)\}/g, function (_m, n) {
      var d = Number(n) + 1;
      return d <= 10 ? '①②③④⑤⑥⑦⑧⑨⑩'[d - 1] : '[' + d + ']';
    });
  }

  function extraerRespuestaAlumno(respuestaAlumno, pregunta) {
    if (respuestaAlumno == null || respuestaAlumno === '') return 'Sin respuesta';
    var tipo = pregunta && pregunta.tipo || 'multiple';
    if (tipo === 'multiple' || tipo === 'opcion_unica' || tipo === 'verdadero_falso') {
      var indice = Number(respuestaAlumno);
      var opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
      if (opciones.length && !isNaN(indice) && indice >= 0 && indice < opciones.length) {
        return opciones[indice];
      }
      return respuestaAlumno;
    }
    if (tipo === 'varias_opciones') {
      var indices = Array.isArray(respuestaAlumno) ? respuestaAlumno : [];
      var opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
      var partes = indices.map(function (idx) {
        if (!isNaN(idx) && idx >= 0 && idx < opciones.length) return opciones[idx];
        return '…';
      });
      return partes.length ? partes.join(' · ') : 'Sin respuesta';
    }
    if (tipo === 'relacionar' && typeof respuestaAlumno === 'object' && !Array.isArray(respuestaAlumno)) {
      var izq = Array.isArray(pregunta.opciones) ? pregunta.opciones.slice(0, Math.floor(pregunta.opciones.length / 2)) : [];
      var der = Array.isArray(pregunta.opciones) ? pregunta.opciones.slice(Math.floor(pregunta.opciones.length / 2)) : [];
      var parejas = [];
      Object.keys(respuestaAlumno).forEach(function (izqIdx) {
        var derIdx = Number(respuestaAlumno[izqIdx]);
        var izqTexto = izq[Number(izqIdx)];
        var derTexto = der[derIdx];
        if (izqTexto != null && derTexto != null) {
          parejas.push(izqTexto + ' → ' + derTexto);
        }
      });
      return parejas.length ? parejas.join(' · ') : 'Sin respuesta';
    }
    if (tipo === 'ordenar') {
      var lista = Array.isArray(respuestaAlumno) ? respuestaAlumno : [];
      var opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
      if (lista.length === opciones.length && lista.every(function (v) { return typeof v === 'number'; })) {
        var ordenado = lista.map(function (idx) { return opciones[idx]; });
        return ordenado.join(' · ');
      }
      return respuestaAlumno;
    }
    if (tipo === 'completar' && Array.isArray(respuestaAlumno)) {
      return respuestaAlumno.join(' / ');
    }
    return respuestaAlumno;
  }

  function formatearNota(nota) {
    var n = Number(nota);
    if (!isFinite(n)) return '—';
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  }

  // ── Arranque ──────────────────────────────────────────────────────────────
  function recordarNombre(nombre) {
    try { window.localStorage.setItem('fb_comunitario:' + estado.token, nombre); } catch (e) { /* sin permiso de almacenamiento: se ignora */ }
  }

  function nombreRecordado() {
    try { return window.localStorage.getItem('fb_comunitario:' + estado.token) || ''; } catch (e) { return ''; }
  }

  // Abre el examen en los DOS flujos. El individual lleva solo el token; el
  // comunitario se identifica por el nombre del alumno (fb_comunitario_iniciar
  // retoma su intento si ya existía y avisa `entregado` si ya lo entregó).
  function iniciar(nombre) {
    if (estado.comunitario && nombre) estado.nombre = nombre;
    var args = { p_token: estado.token };
    if (estado.comunitario) { args.p_nombre = nombre; args.p_grupo = ''; }
    return rpcFlujo('fb_iniciar_por_token', 'fb_comunitario_iniciar', args)
      .then(function (res) {
        if (res.entregado) {
          // Ya entregó con este nombre: la revisión no es un examen nuevo.
          return rpcFlujo('fb_consultar_entrega', 'fb_comunitario_consultar', { p_token: estado.token })
            .then(function (consulta) { pantallaResultado(consulta); });
        }
        estado.intentoId = res.intento_id;
        estado.preguntas = res.preguntas || [];
        estado.respuestas = res.respuestas || {};
        if (nombre) res.nombre_alumno = nombre;
        estado.contexto = res;
        // El campo grupo ya no se pide ni se envía: la cabecera solo muestra
        // el nombre con el que el alumno se identificó al abrir el enlace.
        cabecera(res.titulo, res.alumno_nombre || '', '0/' + estado.preguntas.length);
        if (!estado.preguntas.length) {
          pantallaMensaje({ icono: '!', error: true, titulo: 'Examen sin preguntas', texto: 'Avisa a tu profesor: este examen todavía no tiene preguntas.' });
          return;
        }
        renderPreguntas();
        anunciar('Examen abierto. ' + estado.preguntas.length + ' preguntas.');
      })
      .catch(function (e) {
        pantallaMensaje({ icono: '!', error: true, titulo: 'No se pudo abrir el examen', texto: mensajePublico(e.message) });
        throw e;
      });
  }

  function cargar() {
    estado.token = tokenDeUrl();
    if (!estado.token) {
      pantallaMensaje({
        icono: '🔗', error: true, titulo: 'Enlace incompleto',
        texto: 'Este enlace no incluye el identificador del examen. Pide a tu profesor que te lo envíe de nuevo.'
      });
      return;
    }
    if (window.PwaPill) {
      // #zonaPill está fuera de #lienzo: montarla dentro de #lienzo no
      // servía, porque la primera pantalla (introducción/aviso) vaciaba el
      // innerHTML y la borraba nada más cargar.
      window.PwaPill.montar({
        contenedor: document.getElementById('zonaPill') || document.getElementById('lienzo'),
        id: estado.token,
        esExamen: true
      });
    }

    rpc('fb_estado_enlace', { p_token: estado.token })
      .then(function (ctx) {
        estado.contexto = ctx;
        // La 063 marca los enlaces de la clase: a partir de ahí la identidad
        // del alumno es su nombre, no el token individual.
        estado.comunitario = !!ctx.comunitario;
        cabecera(ctx.titulo, ctx.profesor || '', '');
        if (ctx.usado) return mostrarEntrega();
        if (ctx.cerrado) {
          pantallaMensaje({
            icono: '🔒', titulo: 'Examen no disponible',
            texto: 'Este examen está cerrado o aún no se ha publicado. Contacta con tu profesor.'
          });
          return;
        }
        pantallaIntroduccion(ctx);
      })
      .catch(function (e) {
        cabecera('Examen', '', '');
        pantallaMensaje({
          icono: '🔗', error: true, titulo: 'Enlace no válido',
          texto: e.message === 'Enlace no valido'
            ? 'Este enlace no existe o ya no está activo. Pide a tu profesor que te envíe uno nuevo.'
            : mensajePublico(e.message)
        });
      });
  }

  function mostrarEntrega() {
    return rpcFlujo('fb_consultar_entrega', 'fb_comunitario_consultar', { p_token: estado.token })
      .then(function (res) {
        if (res.estado === 'en_progreso') {
          return iniciar(res.alumno_nombre);
        }
        if (res.estado === 'calificado' || res.estado === 'entregado') {
          return pantallaResultado(res);
        }
        pantallaMensaje({ icono: '🔒', titulo: 'Examen no disponible', texto: 'Contacta con tu profesor.' });
      })
      .catch(function (e) {
        pantallaMensaje({ icono: '!', error: true, titulo: 'No se pudo cargar el resultado', texto: mensajePublico(e.message) });
      });
  }

  window.addEventListener('beforeunload', function (evento) {
    if (!estado.intentoId || estado.enviando) return;
    if (!estado.guardadoTimer) return;
    evento.preventDefault();
    evento.returnValue = '';
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargar);
  else cargar();
})();
