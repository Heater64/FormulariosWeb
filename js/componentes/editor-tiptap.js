(function() {
  'use strict';

  let _modulos = null;

  async function _cargarTiptap() {
    if (_modulos) return _modulos;
    const base = 'https://esm.sh/@tiptap';
    const [core, starterKit, underline, taskList, taskItem, image, placeholder] = await Promise.all([
      import(base + '/core@2.11.0'),
      import(base + '/starter-kit@2.11.0'),
      import(base + '/extension-underline@2.11.0'),
      import(base + '/extension-task-list@2.11.0'),
      import(base + '/extension-task-item@2.11.0'),
      import(base + '/extension-image@2.11.0'),
      import(base + '/extension-placeholder@2.11.0'),
    ]);
    _modulos = {
      Editor: core.Editor,
      StarterKit: starterKit.default,
      Underline: underline.default,
      TaskList: taskList.default,
      TaskItem: taskItem.default,
      Image: image.default,
      Placeholder: placeholder.default,
    };
    return _modulos;
  }

  window.editorTiptap = {
    // Devuelve las extensiones usadas por el editor de notas (para poder
    // reutilizarlas en otros editores si hiciera falta).
    async crear(elemento, contenido, opciones) {
      if (!elemento) return null;
      const { Editor, StarterKit, Underline, TaskList, TaskItem, Image, Placeholder } = await _cargarTiptap();

      const editor = new Editor({
        element: elemento,
        content: contenido || '<p></p>',
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2, 3] },
          }),
          Underline,
          TaskList,
          TaskItem.configure({ nested: true }),
          Image.configure({ inline: false, allowBase64: true }),
          Placeholder.configure({
            placeholder: opciones?.placeholder || 'Escribe tu nota…',
          }),
        ],
        editorProps: {
          attributes: {
            class: 'tiptap-editor',
            'aria-label': opciones?.ariaLabel || 'Editor de texto',
            role: 'textbox',
            'aria-multiline': 'true',
          }
        },
        onUpdate: ({ editor: ed }) => {
          if (opciones?.onUpdate) opciones.onUpdate(ed.getHTML());
        },
      });

      return editor;
    },

    destruir(editor) {
      if (editor) editor.destroy();
    },

    html(editor) {
      return editor ? editor.getHTML() : '';
    },

    setHtml(editor, html) {
      if (editor) editor.commands.setContent(html || '<p></p>');
    }
  };
})();
