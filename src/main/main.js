const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const db   = require('../database/db')
const { autoUpdater } = require('electron-updater')

const isDev = process.env.NODE_ENV !== 'production'

// ─── Clave maestra de emergencia (solo el desarrollador la conoce) ─
const CLAVE_MAESTRA = 'qH8MJbMk*'

autoUpdater.autoDownload         = true
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null

function createWindow() {
  db.initDB()
  mainWindow = new BrowserWindow({
    width:1280, height:800, minWidth:1024, minHeight:680,
    title:'POS Bodega', backgroundColor:'#080e14',
    webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false },
  })
  isDev
    ? mainWindow.loadURL('http://localhost:5173')
    : mainWindow.loadFile(path.join(__dirname,'../../dist-renderer/index.html'))
  mainWindow.setMenuBarVisibility(false)

  if (!isDev) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => autoUpdater.checkForUpdates(), 3000)
    })
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length===0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform!=='darwin') app.quit() })

// ─── Auto-updater eventos ─────────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-status', { tipo:'checking', msg:'Verificando actualizaciones...' })
})
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-status', { tipo:'available', msg:`Nueva versión disponible: v${info.version}`, version:info.version })
})
autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update-status', { tipo:'not-available', msg:'La app está actualizada' })
})
autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update-status', { tipo:'downloading', msg:`Descargando... ${Math.round(progress.percent)}%`, progreso:Math.round(progress.percent) })
})
autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-status', { tipo:'downloaded', msg:`v${info.version} lista para instalar`, version:info.version })
})
autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-status', { tipo:'error', msg:'Error al verificar actualizaciones' })
  console.error('AutoUpdater error:', err)
})

// ─── Auto-updater IPC ─────────────────────────────────────────────
ipcMain.handle('check-for-updates', () => { if (!isDev) autoUpdater.checkForUpdates(); return { checking:true } })
ipcMain.handle('install-update',    () => { autoUpdater.quitAndInstall(false, true) })

// ─── Setup inicial ────────────────────────────────────────────────
ipcMain.handle('is-setup-completado', ()  => db.isSetupCompletado())
ipcMain.handle('completar-setup',     (_,d) => db.completarSetup(d))

// ─── Recuperación de contraseña ───────────────────────────────────
ipcMain.handle('get-admins', () => db.getAdmins())

ipcMain.handle('verificar-codigo-recuperacion', (_, { username, codigo }) => {
  // Primero verificar código de recuperación normal
  const result = db.verificarCodigoRecuperacion(username, codigo)
  if (result.success) return result
  // Si falla, verificar clave maestra de emergencia
  if (codigo === CLAVE_MAESTRA) {
    const admins = db.getAdmins()
    const admin  = admins.find(a => a.username === username)
    if (!admin) return { success:false, error:'Usuario administrador no encontrado' }
    return { success:true, usuarioId:admin.id, esClaveMaestra:true }
  }
  return result
})

ipcMain.handle('resetear-password', (_, d) => db.resetearPassword(d))

// ─── Productos ────────────────────────────────────────────────────
ipcMain.handle('get-productos',              ()               => db.getProductos())
ipcMain.handle('get-producto-by-codigo',     (_,cod)         => db.getProductoByCodigo(cod))
ipcMain.handle('add-producto',               (_,d)           => db.addProducto(d))
ipcMain.handle('update-producto',            (_,d)           => db.updateProducto(d))
ipcMain.handle('delete-producto',            (_,id)          => db.deleteProducto(id))
ipcMain.handle('reponer-stock',              (_,{id,cantidad}) => db.reponerStock(id,cantidad))
ipcMain.handle('importar-productos-excel',   (_,filas)       => db.importarProductosExcel(filas))

// ─── Config / Alertas ─────────────────────────────────────────────
ipcMain.handle('get-productos-bajo-stock',   ()              => db.getProductosBajoStock())
ipcMain.handle('get-config',                ()               => db.getConfig())
ipcMain.handle('update-config',             (_,c)            => db.updateConfig(c))

// ─── Auth / Usuarios ──────────────────────────────────────────────
ipcMain.handle('login',            (_,{username,password})   => db.login(username,password))
ipcMain.handle('get-usuarios',     ()                        => db.getUsuarios())
ipcMain.handle('add-usuario',      (_,d)                     => db.addUsuario(d))
ipcMain.handle('update-usuario',   (_,d)                     => db.updateUsuario(d))
ipcMain.handle('delete-usuario',   (_,id)                    => db.deleteUsuario(id))
ipcMain.handle('cambiar-password', (_,d)                     => db.cambiarPassword(d))

// ─── Turnos ───────────────────────────────────────────────────────
ipcMain.handle('abrir-turno',      (_,uid)   => db.abrirTurno(uid))
ipcMain.handle('cerrar-turno',     (_,uid)   => db.cerrarTurno(uid))
ipcMain.handle('get-turno-activo', (_,uid)   => db.getTurnoActivo(uid))
ipcMain.handle('get-turnos',       (_,limite) => db.getTurnos(limite))

// ─── Clientes ─────────────────────────────────────────────────────
ipcMain.handle('get-clientes',     ()        => db.getClientes())
ipcMain.handle('add-cliente',      (_,d)     => db.addCliente(d))
ipcMain.handle('update-cliente',   (_,d)     => db.updateCliente(d))
ipcMain.handle('delete-cliente',   (_,id)    => db.deleteCliente(id))
ipcMain.handle('buscar-cliente',   (_,query) => db.buscarCliente(query))

// ─── Fiado ────────────────────────────────────────────────────────
ipcMain.handle('get-fiado-cliente',(_,cid)  => db.getFiadoCliente(cid))
ipcMain.handle('add-fiado',        (_,d)    => db.addFiado(d))
ipcMain.handle('pagar-fiado',      (_,d)    => db.pagarFiado(d))
ipcMain.handle('get-resumen-fiado',()       => db.getResumenFiado())

// ─── Ofertas ──────────────────────────────────────────────────────
ipcMain.handle('get-ofertas',      ()       => db.getOfertas())
ipcMain.handle('add-oferta',       (_,d)    => db.addOferta(d))
ipcMain.handle('delete-oferta',    (_,id)   => db.deleteOferta(id))

// ─── Ventas ───────────────────────────────────────────────────────
ipcMain.handle('realizar-venta', (_,{items,montoRecibido,metodoPago,descuento,tipoDescuento,usuarioId,clienteId,esFiado}) =>
  db.realizarVenta(items,montoRecibido,metodoPago,descuento,tipoDescuento,usuarioId,clienteId,esFiado)
)
ipcMain.handle('get-ventas-hoy',       ()     => db.getVentasHoy())
ipcMain.handle('get-resumen-hoy',      ()     => db.getResumenHoy())
ipcMain.handle('get-detalle-venta',    (_,id) => db.getDetalleVenta(id))
ipcMain.handle('get-historial-ventas', (_,f)  => db.getHistorialVentas(f))

// ─── Analytics ────────────────────────────────────────────────────
ipcMain.handle('get-ventas-por-dias',  (_,dias) => db.getVentasPorDias(dias))
ipcMain.handle('get-ventas-por-mes',   ()       => db.getVentasPorMes())
ipcMain.handle('get-top-productos',    (_,dias) => db.getTopProductos(dias))
ipcMain.handle('get-resumen-periodo',  (_,dias) => db.getResumenPeriodo(dias))

// ─── Excel / Backup ───────────────────────────────────────────────
ipcMain.handle('get-datos-excel',      (_,d)  => db.getDatosExcel(d.tipo,d.dias))
ipcMain.handle('get-ruta-bd',          ()     => db.getRutaBD())
ipcMain.handle('exportar-backup', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const r = await dialog.showOpenDialog(win, { title:'Carpeta para el backup', properties:['openDirectory'] })
  if (r.canceled||!r.filePaths.length) return { success:false, canceled:true }
  return db.exportarBackup(r.filePaths[0])
})
ipcMain.handle('importar-backup', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const r = await dialog.showOpenDialog(win, { title:'Selecciona el backup', filters:[{name:'Backup POS',extensions:['json']}], properties:['openFile'] })
  if (r.canceled||!r.filePaths.length) return { success:false, canceled:true }
  return db.importarBackup(r.filePaths[0])
})
ipcMain.handle('elegir-carpeta-excel', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const r = await dialog.showOpenDialog(win, { title:'Carpeta para el Excel', properties:['openDirectory'] })
  if (r.canceled||!r.filePaths.length) return { success:false, canceled:true }
  return { success:true, ruta:r.filePaths[0] }
})