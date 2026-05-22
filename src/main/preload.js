const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Setup inicial
  isSetupCompletado:           ()    => ipcRenderer.invoke('is-setup-completado'),
  completarSetup:              (d)   => ipcRenderer.invoke('completar-setup', d),

  // Recuperación de contraseña
  getAdmins:                   ()    => ipcRenderer.invoke('get-admins'),
  verificarCodigoRecuperacion: (d)   => ipcRenderer.invoke('verificar-codigo-recuperacion', d),
  resetearPassword:            (d)   => ipcRenderer.invoke('resetear-password', d),

  // Auto-updater
  checkForUpdates:             ()    => ipcRenderer.invoke('check-for-updates'),
  installUpdate:               ()    => ipcRenderer.invoke('install-update'),
  onUpdateStatus:              (cb)  => ipcRenderer.on('update-status', (_,data) => cb(data)),
  offUpdateStatus:             ()    => ipcRenderer.removeAllListeners('update-status'),

  // Productos
  getProductos:                ()           => ipcRenderer.invoke('get-productos'),
  getProductoByCodigo:         (cod)        => ipcRenderer.invoke('get-producto-by-codigo', cod),
  addProducto:                 (d)          => ipcRenderer.invoke('add-producto', d),
  updateProducto:              (d)          => ipcRenderer.invoke('update-producto', d),
  deleteProducto:              (id)         => ipcRenderer.invoke('delete-producto', id),
  reponerStock:                (id,cant)    => ipcRenderer.invoke('reponer-stock', { id, cantidad:cant }),
  importarProductosExcel:      (filas)      => ipcRenderer.invoke('importar-productos-excel', filas),

  // Config / Alertas
  getProductosBajoStock:       ()    => ipcRenderer.invoke('get-productos-bajo-stock'),
  getConfig:                   ()    => ipcRenderer.invoke('get-config'),
  updateConfig:                (c)   => ipcRenderer.invoke('update-config', c),

  // Auth / Usuarios
  login:                       (d)   => ipcRenderer.invoke('login', d),
  getUsuarios:                 ()    => ipcRenderer.invoke('get-usuarios'),
  addUsuario:                  (d)   => ipcRenderer.invoke('add-usuario', d),
  updateUsuario:               (d)   => ipcRenderer.invoke('update-usuario', d),
  deleteUsuario:               (id)  => ipcRenderer.invoke('delete-usuario', id),
  cambiarPassword:             (d)   => ipcRenderer.invoke('cambiar-password', d),

  // Turnos
  abrirTurno:                  (uid)    => ipcRenderer.invoke('abrir-turno', uid),
  cerrarTurno:                 (uid)    => ipcRenderer.invoke('cerrar-turno', uid),
  getTurnoActivo:              (uid)    => ipcRenderer.invoke('get-turno-activo', uid),
  getTurnos:                   (limite) => ipcRenderer.invoke('get-turnos', limite),

  // Clientes
  getClientes:                 ()        => ipcRenderer.invoke('get-clientes'),
  addCliente:                  (d)       => ipcRenderer.invoke('add-cliente', d),
  updateCliente:               (d)       => ipcRenderer.invoke('update-cliente', d),
  deleteCliente:               (id)      => ipcRenderer.invoke('delete-cliente', id),
  buscarCliente:               (query)   => ipcRenderer.invoke('buscar-cliente', query),

  // Fiado
  getFiadoCliente:             (cid) => ipcRenderer.invoke('get-fiado-cliente', cid),
  addFiado:                    (d)   => ipcRenderer.invoke('add-fiado', d),
  pagarFiado:                  (d)   => ipcRenderer.invoke('pagar-fiado', d),
  getResumenFiado:             ()    => ipcRenderer.invoke('get-resumen-fiado'),

  // Ofertas
  getOfertas:                  ()    => ipcRenderer.invoke('get-ofertas'),
  addOferta:                   (d)   => ipcRenderer.invoke('add-oferta', d),
  deleteOferta:                (id)  => ipcRenderer.invoke('delete-oferta', id),

  // Ventas
  realizarVenta:               (d)   => ipcRenderer.invoke('realizar-venta', d),
  getVentasHoy:                ()    => ipcRenderer.invoke('get-ventas-hoy'),
  getResumenHoy:               ()    => ipcRenderer.invoke('get-resumen-hoy'),
  getDetalleVenta:             (id)  => ipcRenderer.invoke('get-detalle-venta', id),
  getHistorialVentas:          (f)   => ipcRenderer.invoke('get-historial-ventas', f),

  // Analytics
  getVentasPorDias:            (dias) => ipcRenderer.invoke('get-ventas-por-dias', dias),
  getVentasPorMes:             ()     => ipcRenderer.invoke('get-ventas-por-mes'),
  getTopProductos:             (dias) => ipcRenderer.invoke('get-top-productos', dias),
  getResumenPeriodo:           (dias) => ipcRenderer.invoke('get-resumen-periodo', dias),

  // Excel / Backup
  getDatosExcel:               (d)  => ipcRenderer.invoke('get-datos-excel', d),
  elegirCarpetaExcel:          ()   => ipcRenderer.invoke('elegir-carpeta-excel'),
  getRutaBD:                   ()   => ipcRenderer.invoke('get-ruta-bd'),
  exportarBackup:              ()   => ipcRenderer.invoke('exportar-backup'),
  importarBackup:              ()   => ipcRenderer.invoke('importar-backup'),
})