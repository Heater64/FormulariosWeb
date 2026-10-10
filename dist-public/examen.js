/* ==============================================================================
 * public-site/examen.js — página pública del alumno (sin cuenta)
 * ----------------------------------------------------------------------------
 * El alumno llega por un enlace individual (/e/<token>). Esta página:
 *   1. valida el enlace contra el servidor (fb_estado_enlace),
 *   2. pide nombre obligatoriamente y grupo (opcional),
 *   3. inicia/retoma el único intento del enlace (fb_iniciar_por_token),
 *   4. autoguarda el borrador (fb_guardar_borrador_token),
 *   5. entrega y muestra el resultado (fb_entregar_por_token / fb_consultar_entrega).
 *
 * NUNCA decide permisos, notas ni envíos: todo eso lo valida el servidor. Esta
 * página solo pinta lo que las RPCs devuelven, y las RPCs no devuelven
 * respuestas correctas ni notas de otros alumnos.
 * ============================================================================*/
(function () {
  'use strict';

  var estado = {
    token: null,
    contexto: null,
    intentoId: null,
    preguntas: [],
    respuestas: {},
    enviando: false,
    guardadoTimer: null
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
    var m = /\/e\/([A-Za-z0-9_-]{10,})/.exec(window.location.pathname || '');
    if (m) return m[1];
    var q = new URLSearchParams(window.location.search);
    return q.get('t') || q.get('token') || '';
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

  function rpc(nombre, args) {
    var sb = window.supabaseClient;
    if (!sb) return Promise.reject(new Error('No se pudo conectar con el servidor. Recarga la página e inténtalo de nuevo.'));
    return sb.rpc(nombre, args || {}).then(function (res) {
      if (res.error) throw new Error(mensajeError(res.error));
      return res.data;
    });
  }

  // ── Cabecera y progreso ───────────────────────────────────────────────────
  function cabecera(titulo, sub, estadoTexto) {
    var nombre = titulo || 'Examen';
    $('cabTitulo').textContent = nombre;
    $('cabSub').textContent = sub || '';
    $('cabEstado').textContent = estadoTexto || '';
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

  function progreso(fraccion) {
    var barra = $('progresoBarra');
    if (!barra) return;
    var pct = Math.max(0, Math.min(100, Math.round(fraccion * 100)));
    barra.style.width = pct + '%';
  }

  // ── Pantallas ─────────────────────────────────────────────────────────────
  function pantallaMensaje(opciones) {
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

  function pantallaIntroduccion(ctx) {
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
    inputNombre.value = ctx.nombre_alumno || '';
    campoNombre.appendChild(inputNombre);
    form.appendChild(campoNombre);

    var campoGrupo = el('div', 'campo');
    var etiquetaGrupo = el('label', null, 'Grupo (opcional)');
    etiquetaGrupo.setAttribute('for', 'grupoAlumno');
    campoGrupo.appendChild(etiquetaGrupo);
    var inputGrupo = el('input');
    inputGrupo.type = 'text';
    inputGrupo.id = 'grupoAlumno';
    inputGrupo.name = 'grupo';
    inputGrupo.maxLength = 80;
    inputGrupo.value = ctx.grupo_alumno || '';
    campoGrupo.appendChild(inputGrupo);
    campoGrupo.appendChild(el('p', 'ayuda', 'Ej.: 3º B, Grupo de los martes…'));
    form.appendChild(campoGrupo);

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
      iniciar(inputNombre.value.trim(), inputGrupo.value.trim());
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

  // Mezcla estable por pregunta: el mismo enlace muestra siempre el mismo
  // orden (al retomar el borrador no cambia nada bajo el alumno), pero
  // distinto al orden de edición del profesor para «relacionar» y «ordenar».
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
    // Si la mezcla casualmente sale igual al orden original, gira un paso.
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
      // Array numérico (varias_opciones / ordenar): basta con que haya algo.
      // Array de texto (huecos de completar): todos los huecos deben ir llenos.
      var soloNumeros = valor.every(function (v) { return typeof v === 'number'; });
      return soloNumeros ? true : conValor.length === valor.length;
    }
    // Mapa de parejas (relacionar): solo se guarda cuando ya está completo.
    if (typeof valor === 'object') {
      var claves = Object.keys(valor);
      return claves.length > 0 && claves.every(function (k) { return typeof valor[k] === 'number'; });
    }
    return true;
  }

  function renderPreguntas() {
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
    texto.appendChild(document.createTextNode(pregunta.texto || ('Pregunta ' + (indice + 1))));
    if (pregunta.obligatoria) {
      var marca = el('span', 'pregunta__obligatoria');
      marca.textContent = ' *';
      marca.setAttribute('aria-hidden', 'false');
      texto.appendChild(marca);
    }
    cont.appendChild(texto);

    // Cada interacción del alumno se propaga por esta vía común.
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

  // Respuesta única (incluye V/F legado, que llega sin opciones configuradas).
  function renderOpciones(cont, pregunta, indice, actualizar) {
    var opciones = opcionesDe(pregunta);
    if (!opciones.length && pregunta.tipo === 'verdadero_falso') opciones = ['Verdadero', 'Falso'];
    var fs = el('fieldset');
    // El nombre accesible del grupo va oculto a la vista pero no a lectores
    // de pantalla: display:none eliminaría el nombre del árbol accesible.
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

  // Varios de los anteriores pueden ser válidos (array de índices marcados).
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

  // Frase con hueco(s): con huecos en el enunciado se abre un campo por hueco
  // (respuesta = array de textos); sin marcadores, un solo campo que el
  // servidor compara contra las palabras aceptadas («a|b|c»).
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

  // Una línea; el servidor normaliza mayúsculas/espacios y el profesor la
  // corrige a mano con la respuesta de referencia del examen.
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

  // Parejas: la columna derecha se muestra en orden estable (mezclaEstable)
  // y la respuesta es el mapa {posición izquierda: índice de la derecha}.
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

    var revisar = function () {
      var mapa = {};
      var completo = true;
      selects.forEach(function (select, i) {
        if (select.value === '') { completo = false; return; }
        mapa[i] = Number(select.value);
      });
      // Solo se guarda el mapa completo: así «obligatoria» significa todas.
      if (completo) estado.respuestas[pregunta.id] = mapa;
      else delete estado.respuestas[pregunta.id];
      actualizar();
    };
    selects.forEach(function (select) { select.addEventListener('change', revisar); });

    if (mitad < 2) {
      cont.appendChild(el('div', 'aviso aviso--error', 'Esta pregunta no tiene parejas configuradas. Avisa a tu profesor.'));
    }
  }

  // Secuencia: los elementos llegan desordenados (orden estable) y el alumno
  // los reordena con ▲▼. La respuesta es el array de índices en su orden
  // escogido; el orden correcto es el de edición del profesor (0,1,2…).
  function renderOrdenar(cont, pregunta, actualizar) {
    var opciones = opcionesDe(pregunta);
    var previa = estado.respuestas[pregunta.id];
    // El orden solo se guarda al mover algo: hasta entonces sigue sin responder.
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

  // Desarrollo (texto_largo) y tipos legados sin widget específico.
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
      rpc('fb_guardar_borrador_token', { p_token: estado.token, p_respuestas: estado.respuestas })
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

    return rpc('fb_entregar_por_token', { p_token: estado.token, p_respuestas: estado.respuestas })
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
    var nota = el('p', 'sub');
    nota.style.fontSize = 'var(--xs)';
    nota.textContent = 'Puedes cerrar esta pestaña. Guarda el enlace para consultar tu resultado.';
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
    var extra = el('div');
    if (res.estado === 'calificado') {
      var marca = el('div');
      marca.style.marginBottom = 'var(--md)';
      var valorNota = el('span', 'nota', formatearNota(res.nota));
      marca.appendChild(valorNota);
      marca.appendChild(el('span', 'nota__sobre', 'sobre 10'));
      extra.appendChild(marca);

      if (res.puntuacion != null) {
        var lista = el('ul', 'detalle');
        var filaPct = el('li');
        filaPct.appendChild(el('span', null, 'Aciertos'));
        filaPct.appendChild(el('strong', null, Math.round(Number(res.puntuacion)) + ' %'));
        lista.appendChild(filaPct);
        extra.appendChild(lista);
      }
      if (res.observaciones) {
        var obs = el('div', 'aviso aviso--ok');
        obs.appendChild(el('strong', null, 'Comentario del profesor: '));
        obs.appendChild(document.createTextNode(res.observaciones));
        obs.style.marginTop = 'var(--md)';
        extra.appendChild(obs);
      }
      extra.style.marginTop = 'var(--md)';
      pantallaMensaje({ icono: '✓', titulo: 'Resultado', texto: res.titulo || 'Examen', extra: extra });
    } else {
      var aviso = el('div', 'aviso aviso--warn');
      aviso.appendChild(el('strong', null, 'Entrega registrada. '));
      aviso.appendChild(document.createTextNode(
        res.pendiente_correccion
          ? 'Quedan ' + res.pendiente_correccion + ' respuesta(s) por corregir. La nota final aparecerá aquí.'
          : 'La nota final aparecerá aquí cuando tu profesor termine la corrección.'
      ));
      extra.appendChild(aviso);
      extra.style.marginTop = 'var(--md)';
      pantallaMensaje({ icono: '⏳', titulo: 'Pendiente de corrección', texto: res.titulo || 'Examen', extra: extra });
    }
  }

  function formatearNota(nota) {
    var n = Number(nota);
    if (!isFinite(n)) return '—';
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  }

  // ── Arranque ──────────────────────────────────────────────────────────────
  function iniciar(nombre, grupo) {
    return rpc('fb_iniciar_por_token', { p_token: estado.token })
      .then(function (res) {
        estado.intentoId = res.intento_id;
        estado.preguntas = res.preguntas || [];
        estado.respuestas = res.respuestas || {};
        if (nombre) res.nombre_alumno = nombre;
        if (grupo) res.grupo_alumno = grupo;
        estado.contexto = res;
        cabecera(res.titulo, (res.alumno_nombre ? res.alumno_nombre : '') + (res.alumno_grupo ? ' · ' + res.alumno_grupo : ''), '0/' + estado.preguntas.length);
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

    rpc('fb_estado_enlace', { p_token: estado.token })
      .then(function (ctx) {
        estado.contexto = ctx;
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
    return rpc('fb_consultar_entrega', { p_token: estado.token })
      .then(function (res) {
        if (res.estado === 'en_progreso') {
          // El alumno abrió el examen antes y no entregó: retoma donde estaba.
          return iniciar(res.alumno_nombre, res.alumno_grupo);
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

  // Guardar el borrador si el alumno cierra pestaña con cambios recientes.
  window.addEventListener('beforeunload', function (evento) {
    if (!estado.intentoId || estado.enviando) return;
    if (!estado.guardadoTimer) return;
    evento.preventDefault();
    evento.returnValue = '';
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargar);
  else cargar();
})();
