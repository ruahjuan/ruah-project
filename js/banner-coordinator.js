// ============================================================
//  RUAH Cancionero — Coordinador de Banners
//  Archivo: /js/banner-coordinator.js
//  Evita que el banner de instalación y el de actualización
//  se muestren al mismo tiempo (comparten el mismo elemento
//  #pwa-install-banner). Debe cargarse ANTES de pwa.js y
//  update.js.
// ============================================================

window.ruahBanner = {
  activo: null,      // null | 'install' | 'update'
  pendiente: null,   // guarda la función a ejecutar cuando se libere el banner

  // Pide el banner. Si está libre, ejecuta mostrarFn ahora.
  // Si está ocupado por el otro tipo, guarda mostrarFn para después.
  solicitar(tipo, mostrarFn) {
    if (this.activo === null || this.activo === tipo) {
      this.activo = tipo;
      mostrarFn();
    } else {
      // Ya hay otro banner activo: se reemplaza cualquier pendiente
      // anterior del mismo tipo por la versión más reciente.
      this.pendiente = { tipo, mostrarFn };
    }
  },

  // Libera el banner. Si había algo pendiente, lo muestra a continuación.
  liberar(tipo) {
    if (this.activo !== tipo) return;
    this.activo = null;

    if (this.pendiente) {
      const { tipo: tipoPend, mostrarFn } = this.pendiente;
      this.pendiente = null;
      this.solicitar(tipoPend, mostrarFn);
    }
  },
};
