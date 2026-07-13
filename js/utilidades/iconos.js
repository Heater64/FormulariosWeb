window.Iconos = {
  render(nombre, clases = '') {
    return `<i data-lucide="${nombre}"${clases ? ` class="${clases}"` : ''}></i>`;
  },
  actualizar() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn('Iconos Lucide:', e.message);
      }
    }
  }
};
