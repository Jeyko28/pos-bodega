const path = require('path')
const fs   = require('fs')
const { app } = require('electron')

const dbPath = path.join(app.getPath('userData'), 'pos-bodega.json')

let data = {
  productos: [], ventas: [], detalle_ventas: [],
  usuarios: [], turnos: [],
  clientes: [], fiado: [], pagos_fiado: [],
  ofertas: [],
  config: { umbral_stock_bajo: 5 },
  nextId: { productos:1, ventas:1, detalle_ventas:1, usuarios:1, turnos:1, clientes:1, fiado:1, pagos_fiado:1, ofertas:1 },
  setup_completado: false,
}

function save() { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)) }

function initDB() {
  if (fs.existsSync(dbPath)) {
    data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))

    // ── Migración v1.0 → v1.1: tipo_venta y unidad ──
    let migrado = false
    data.productos = data.productos.map(p => {
      if (!p.tipo_venta) { migrado = true; return { ...p, tipo_venta:'unidad', unidad:'unidad' } }
      return p
    })
    if (migrado) save()

    // ── Migración v1.1: dni_ruc en clientes ──
    data.clientes = data.clientes.map(c => {
      if (c.dni_ruc === undefined) return { ...c, dni_ruc: null }
      return c
    })

    // ── Migración v1.1: comprobante en config ──
    if (!data.config.tipo_comprobante) {
      data.config.tipo_comprobante = 'ticket'
      data.config.regimen          = 'nuevo_rus'
      data.config.serie_boleta     = 'B001'
      save()
    }

    data.ventas = data.ventas.map(v => ({
      ...v,
      metodo_pago:   v.metodo_pago   || 'Efectivo',
      descuento:     v.descuento     || 0,
      tipo_descuento: v.tipo_descuento || 'ninguno'
    }))

    if (!data.config)       data.config       = { umbral_stock_bajo:5 }
    if (!data.usuarios)     data.usuarios     = []
    if (!data.turnos)       data.turnos       = []
    if (!data.clientes)     data.clientes     = []
    if (!data.fiado)        data.fiado        = []
    if (!data.pagos_fiado)  data.pagos_fiado  = []
    if (!data.ofertas)      data.ofertas      = []
    if (data.setup_completado === undefined) data.setup_completado = data.usuarios.length > 0
    if (!data.nextId.clientes)    data.nextId.clientes    = 1
    if (!data.nextId.fiado)       data.nextId.fiado       = 1
    if (!data.nextId.pagos_fiado) data.nextId.pagos_fiado = 1
    if (!data.nextId.ofertas)     data.nextId.ofertas     = 1
    if (!data.nextId.usuarios)    data.nextId.usuarios    = 1
    if (!data.nextId.turnos)      data.nextId.turnos      = 1

    console.log('✅ BD cargada desde:', dbPath)
  } else {
    console.log('✅ BD nueva — esperando configuración inicial')
    save()
  }
}

// ─── SETUP INICIAL ────────────────────────────────────────────────
function isSetupCompletado() { return data.setup_completado === true }

function completarSetup({ negocioNombre, negocioRuc, negocioDireccion, negocioTelefono, adminNombre, adminUsername, adminPassword, codigoRecuperacion }) {
  data.config = {
    ...data.config,
    negocio_nombre:   negocioNombre,
    negocio_ruc:      negocioRuc      || null,
    negocio_direccion: negocioDireccion || null,
    negocio_telefono:  negocioTelefono  || null,
    ticket_mensaje:   '¡Gracias por su compra! Vuelva pronto 😊',
    tipo_comprobante: 'ticket',
    regimen:          'nuevo_rus',
    serie_boleta:     'B001',
  }
  const admin = { id:data.nextId.usuarios++, nombre:adminNombre, username:adminUsername, password:adminPassword, codigo_recuperacion:codigoRecuperacion, rol:'admin', activo:true, creado_en:new Date().toISOString() }
  data.usuarios.push(admin)
  data.setup_completado = true
  save()
  const { password:_, codigo_recuperacion:__, ...adminSin } = admin
  return { success:true, usuario:adminSin }
}

// ─── RECUPERACIÓN DE CONTRASEÑA ───────────────────────────────────
function verificarCodigoRecuperacion(username, codigo) {
  const u = data.usuarios.find(u => u.username===username && u.rol==='admin' && u.activo)
  if (!u) return { success:false, error:'Usuario administrador no encontrado' }
  if (!u.codigo_recuperacion) return { success:false, error:'Este usuario no tiene código de recuperación' }
  if (u.codigo_recuperacion.toUpperCase() !== codigo.toUpperCase()) return { success:false, error:'Código de recuperación incorrecto' }
  return { success:true, usuarioId:u.id }
}
function resetearPassword({ usuarioId, nuevaPassword }) {
  const u = data.usuarios.find(u => u.id===usuarioId)
  if (!u) return { success:false, error:'Usuario no encontrado' }
  u.password = nuevaPassword; save(); return { success:true }
}
function getAdmins() {
  return data.usuarios.filter(u => u.rol==='admin' && u.activo).map(({ password:_, codigo_recuperacion:__, ...u }) => u)
}

// ─── PRODUCTOS ────────────────────────────────────────────────────
function getProductos() { return [...data.productos].sort((a,b) => a.nombre.localeCompare(b.nombre)) }
function getProductoByCodigo(codigo) { return data.productos.find(p => p.codigo===codigo) || null }
function addProducto({ nombre, precio, stock, codigo, categoria, tipo_venta, unidad }) {
  const p = { id:data.nextId.productos++, nombre, precio:parseFloat(precio), stock:parseFloat(stock), codigo:codigo||null, categoria:categoria||'General', tipo_venta:tipo_venta||'unidad', unidad:unidad||'unidad', creado_en:new Date().toISOString() }
  data.productos.push(p); save(); return p
}
function updateProducto({ id, nombre, precio, stock, codigo, categoria, tipo_venta, unidad }) {
  const i = data.productos.findIndex(p => p.id===id)
  if (i!==-1) { data.productos[i] = { ...data.productos[i], nombre, precio:parseFloat(precio), stock:parseFloat(stock), codigo:codigo||null, categoria, tipo_venta:tipo_venta||'unidad', unidad:unidad||'unidad' }; save(); return data.productos[i] }
}
function deleteProducto(id) { data.productos=data.productos.filter(p=>p.id!==id); save(); return{success:true} }
function reponerStock(id, cantidad) { const p=data.productos.find(p=>p.id===id); if(p){p.stock+=parseFloat(cantidad);save();return{...p}} }

function importarProductosExcel(filas) {
  const r={agregados:0,actualizados:0,errores:[]}
  filas.forEach((f,idx)=>{
    const l=idx+2
    const nombre=String(f.nombre||f.Nombre||f.NOMBRE||'').trim()
    if(!nombre){r.errores.push(`Fila ${l}: nombre vacío`);return}
    const precio=parseFloat(f.precio||f.Precio||f.PRECIO)
    if(isNaN(precio)||precio<0){r.errores.push(`Fila ${l}: precio inválido`);return}
    const stock=parseFloat(f.stock||f.Stock||f.STOCK)
    if(isNaN(stock)||stock<0){r.errores.push(`Fila ${l}: stock inválido`);return}
    const codigo=String(f.codigo||f.Código||f.CODIGO||f['Código de barras']||'').trim()||null
    const categoria=String(f.categoria||f.Categoría||f.CATEGORIA||'General').trim()||'General'
    const tipo_venta=String(f.tipo_venta||f['Tipo de venta']||'unidad').trim().toLowerCase()==='granel'?'granel':'unidad'
    const unidad=tipo_venta==='granel'?'kg':'unidad'
    if(codigo){const ex=data.productos.find(p=>p.codigo===codigo);if(ex){ex.nombre=nombre;ex.precio=precio;ex.stock=stock;ex.categoria=categoria;ex.tipo_venta=tipo_venta;ex.unidad=unidad;r.actualizados++;return}}
    const pn=data.productos.find(p=>p.nombre.toLowerCase()===nombre.toLowerCase())
    if(pn){pn.precio=precio;pn.stock=stock;pn.categoria=categoria;if(codigo)pn.codigo=codigo;pn.tipo_venta=tipo_venta;pn.unidad=unidad;r.actualizados++;return}
    data.productos.push({id:data.nextId.productos++,nombre,precio,stock,codigo:codigo||null,categoria,tipo_venta,unidad,creado_en:new Date().toISOString()})
    r.agregados++
  })
  if(r.agregados>0||r.actualizados>0)save()
  return r
}

// ─── CONFIG / ALERTAS ─────────────────────────────────────────────
function getProductosBajoStock() { const u=data.config.umbral_stock_bajo||5;return[...data.productos].filter(p=>p.stock<=u).sort((a,b)=>a.stock-b.stock) }
function getConfig() { return data.config }
function updateConfig(config) { data.config={...data.config,...config};save();return data.config }

// ─── AUTH ─────────────────────────────────────────────────────────
function login(username,password) { const u=data.usuarios.find(u=>u.username===username&&u.password===password&&u.activo);if(!u)return{success:false,error:'Usuario o contraseña incorrectos'};const{password:_,codigo_recuperacion:__,...s}=u;return{success:true,usuario:s} }
function getUsuarios() { return data.usuarios.map(({password:_,codigo_recuperacion:__,...u})=>u) }
function addUsuario({nombre,username,password,rol}) { if(data.usuarios.find(u=>u.username===username))return{success:false,error:'El nombre de usuario ya existe'};const u={id:data.nextId.usuarios++,nombre,username,password,rol:rol||'cajero',activo:true,creado_en:new Date().toISOString()};data.usuarios.push(u);save();const{password:_,...s}=u;return{success:true,usuario:s} }
function updateUsuario({id,nombre,username,password,rol,activo}) { const i=data.usuarios.findIndex(u=>u.id===id);if(i===-1)return{success:false,error:'No encontrado'};const dup=data.usuarios.find(u=>u.username===username&&u.id!==id);if(dup)return{success:false,error:'Usuario ya existe'};data.usuarios[i]={...data.usuarios[i],nombre,username,rol,activo:activo!==undefined?activo:data.usuarios[i].activo,...(password?{password}:{})};save();const{password:_,...s}=data.usuarios[i];return{success:true,usuario:s} }
function deleteUsuario(id) { const u=data.usuarios.find(u=>u.id===id);if(!u)return{success:false,error:'No encontrado'};if(u.rol==='admin'&&data.usuarios.filter(u=>u.rol==='admin'&&u.activo).length<=1)return{success:false,error:'Debe existir al menos un admin'};data.usuarios=data.usuarios.filter(u=>u.id!==id);save();return{success:true} }
function cambiarPassword({id,passwordActual,passwordNueva}) { const u=data.usuarios.find(u=>u.id===id);if(!u)return{success:false,error:'No encontrado'};if(u.password!==passwordActual)return{success:false,error:'Contraseña actual incorrecta'};u.password=passwordNueva;save();return{success:true} }

// ─── TURNOS ───────────────────────────────────────────────────────
function abrirTurno(usuarioId) { const t=data.turnos.find(t=>t.usuario_id===usuarioId&&t.estado==='abierto');if(t)return{success:false,error:'Ya tienes un turno abierto',turno:t};const turno={id:data.nextId.turnos++,usuario_id:usuarioId,apertura:new Date().toISOString(),cierre:null,estado:'abierto'};data.turnos.push(turno);save();return{success:true,turno} }
function cerrarTurno(usuarioId) { const i=data.turnos.findIndex(t=>t.usuario_id===usuarioId&&t.estado==='abierto');if(i===-1)return{success:false,error:'No tienes turno abierto'};data.turnos[i].cierre=new Date().toISOString();data.turnos[i].estado='cerrado';const ap=new Date(data.turnos[i].apertura),ci=new Date(data.turnos[i].cierre);const vt=data.ventas.filter(v=>{const f=new Date(v.fecha);return f>=ap&&f<=ci});data.turnos[i].resumen={total_ventas:vt.length,ingresos:vt.reduce((s,v)=>s+v.total,0),efectivo:vt.filter(v=>v.metodo_pago==='Efectivo').reduce((s,v)=>s+v.total,0),yape:vt.filter(v=>v.metodo_pago==='Yape').reduce((s,v)=>s+v.total,0),plin:vt.filter(v=>v.metodo_pago==='Plin').reduce((s,v)=>s+v.total,0),tarjeta:vt.filter(v=>v.metodo_pago==='Tarjeta').reduce((s,v)=>s+v.total,0)};save();return{success:true,turno:data.turnos[i]} }
function getTurnoActivo(usuarioId) { return data.turnos.find(t=>t.usuario_id===usuarioId&&t.estado==='abierto')||null }
function getTurnos(limite=20) { const us=data.usuarios;return[...data.turnos].sort((a,b)=>new Date(b.apertura)-new Date(a.apertura)).slice(0,limite).map(t=>({...t,nombre_usuario:us.find(u=>u.id===t.usuario_id)?.nombre||'Desconocido'})) }

// ─── CLIENTES ─────────────────────────────────────────────────────
function getClientes() { return[...data.clientes].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(c=>({...c,deuda_total:data.fiado.filter(f=>f.cliente_id===c.id&&f.estado==='pendiente').reduce((s,f)=>s+f.saldo,0)})) }
function addCliente({nombre,telefono,referencia,dni_ruc}) { const c={id:data.nextId.clientes++,nombre,telefono:telefono||null,referencia:referencia||null,dni_ruc:dni_ruc||null,creado_en:new Date().toISOString()};data.clientes.push(c);save();return c }
function updateCliente({id,nombre,telefono,referencia,dni_ruc}) { const i=data.clientes.findIndex(c=>c.id===id);if(i!==-1){data.clientes[i]={...data.clientes[i],nombre,telefono:telefono||null,referencia:referencia||null,dni_ruc:dni_ruc||null};save();return data.clientes[i]} }
function deleteCliente(id) { const t=data.fiado.some(f=>f.cliente_id===id&&f.estado==='pendiente');if(t)return{success:false,error:'El cliente tiene deuda pendiente'};data.clientes=data.clientes.filter(c=>c.id!==id);save();return{success:true} }
function buscarCliente(query) { const q=query.toLowerCase();return data.clientes.filter(c=>c.nombre.toLowerCase().includes(q)||(c.telefono&&c.telefono.includes(q))||(c.dni_ruc&&c.dni_ruc.includes(q))).map(c=>({...c,deuda_total:data.fiado.filter(f=>f.cliente_id===c.id&&f.estado==='pendiente').reduce((s,f)=>s+f.saldo,0)})) }

// ─── FIADO ────────────────────────────────────────────────────────
function getFiadoCliente(clienteId) { return data.fiado.filter(f=>f.cliente_id===clienteId).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(f=>({...f,pagos:data.pagos_fiado.filter(p=>p.fiado_id===f.id)})) }
function addFiado({clienteId,monto,concepto,usuarioId}) { const f={id:data.nextId.fiado++,cliente_id:clienteId,monto_original:parseFloat(monto),saldo:parseFloat(monto),concepto:concepto||'Compra al crédito',usuario_id:usuarioId||null,estado:'pendiente',fecha:new Date().toISOString()};data.fiado.push(f);save();return f }
function pagarFiado({fiadoId,monto,usuarioId}) { const f=data.fiado.find(f=>f.id===fiadoId);if(!f)return{success:false,error:'Fiado no encontrado'};const mp=Math.min(parseFloat(monto),f.saldo);const p={id:data.nextId.pagos_fiado++,fiado_id:fiadoId,monto:mp,usuario_id:usuarioId||null,fecha:new Date().toISOString()};data.pagos_fiado.push(p);f.saldo=Math.max(f.saldo-mp,0);if(f.saldo===0)f.estado='pagado';save();return{success:true,pago:p,saldo_restante:f.saldo} }
function getResumenFiado() { const p=data.fiado.filter(f=>f.estado==='pendiente');return{total_deuda:p.reduce((s,f)=>s+f.saldo,0),clientes_deuda:new Set(p.map(f=>f.cliente_id)).size,total_fiados:p.length} }

// ─── OFERTAS ──────────────────────────────────────────────────────
function getOfertas() { return data.ofertas.filter(o=>!o.fecha_fin||new Date(o.fecha_fin)>=new Date()).map(o=>({...o,producto:data.productos.find(p=>p.id===o.producto_id)})).filter(o=>o.producto) }
function addOferta({productoId,tipo,valor,descripcion,fechaFin}) { data.ofertas=data.ofertas.filter(o=>o.producto_id!==productoId);const o={id:data.nextId.ofertas++,producto_id:productoId,tipo,valor:parseFloat(valor),descripcion:descripcion||null,fecha_inicio:new Date().toISOString(),fecha_fin:fechaFin||null,activa:true};data.ofertas.push(o);save();return{...o,producto:data.productos.find(p=>p.id===productoId)} }
function deleteOferta(id) { data.ofertas=data.ofertas.filter(o=>o.id!==id);save();return{success:true} }

// ─── BACKUP / EXCEL ───────────────────────────────────────────────
function exportarBackup(destino) { try{const n=`backup-pos-${new Date().toISOString().slice(0,10)}.json`;const r=path.join(destino,n);fs.copyFileSync(dbPath,r);return{success:true,ruta:r,nombre:n}}catch(e){return{success:false,error:e.message}} }
function importarBackup(rutaArchivo) { try{const c=fs.readFileSync(rutaArchivo,'utf-8');const bd=JSON.parse(c);if(!bd.productos||!bd.ventas||!bd.nextId)return{success:false,error:'Archivo no válido'};if(fs.existsSync(dbPath))fs.copyFileSync(dbPath,dbPath+'.prev');fs.writeFileSync(dbPath,c);data=bd;return{success:true}}catch(e){return{success:false,error:e.message}} }
function getRutaBD() { return dbPath }
function getDatosExcel(tipo,dias) {
  const desde=new Date();desde.setDate(desde.getDate()-(dias||365))
  if(tipo==='ventas'){const us=data.usuarios,cl=data.clientes;return data.ventas.filter(v=>new Date(v.fecha)>=desde).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(v=>({'N° Venta':v.id,'Comprobante':v.tipo_comprobante||'ticket','Serie-N°':v.numero_comprobante||`#${String(v.id).padStart(5,'0')}`,'Fecha':new Date(v.fecha).toLocaleDateString('es-PE'),'Hora':new Date(v.fecha).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}),'Cajero':us.find(u=>u.id===v.usuario_id)?.nombre||'—','Cliente':cl.find(c=>c.id===v.cliente_id)?.nombre||v.comprador_nombre||'—','DNI/RUC comprador':v.comprador_dni_ruc||'—','Método Pago':v.metodo_pago,'Subtotal':v.subtotal_bruto||v.total,'Descuento':v.descuento||0,'Total':v.total,'Monto Recibido':v.monto_recibido||0,'Vuelto':v.vuelto||0,'Es Fiado':v.es_fiado?'Sí':'No'}))}
  if(tipo==='productos'){return[...data.productos].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p=>({'ID':p.id,'Nombre':p.nombre,'Categoría':p.categoria,'Tipo':p.tipo_venta==='granel'?'A granel':'Por unidad','Unidad':p.unidad,'Precio':p.precio,'Stock':p.stock,'Código':p.codigo||'—','Creado':new Date(p.creado_en).toLocaleDateString('es-PE')}))}
  if(tipo==='clientes'){return[...data.clientes].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(c=>{const d=data.fiado.filter(f=>f.cliente_id===c.id&&f.estado==='pendiente').reduce((s,f)=>s+f.saldo,0);return{'ID':c.id,'Nombre':c.nombre,'DNI/RUC':c.dni_ruc||'—','Teléfono':c.telefono||'—','Referencia':c.referencia||'—','Deuda Total':d,'Registrado':new Date(c.creado_en).toLocaleDateString('es-PE')}})}
  if(tipo==='fiado'){const cl=data.clientes;return[...data.fiado].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(f=>({'ID':f.id,'Cliente':cl.find(c=>c.id===f.cliente_id)?.nombre||'—','Concepto':f.concepto,'Monto Orig.':f.monto_original,'Saldo':f.saldo,'Estado':f.estado,'Fecha':new Date(f.fecha).toLocaleDateString('es-PE')}))}
  return[]
}

// ─── HISTORIAL VENTAS ─────────────────────────────────────────────
function getHistorialVentas({ fechaDesde, fechaHasta, metodoPago, usuarioId, soloFiado, busqueda, pagina=1, porPagina=30 }) {
  const us=data.usuarios, cl=data.clientes
  let ventas=[...data.ventas]
  if(fechaDesde){const desde=new Date(fechaDesde+'T00:00:00');ventas=ventas.filter(v=>new Date(v.fecha)>=desde)}
  if(fechaHasta){const hasta=new Date(fechaHasta+'T23:59:59');ventas=ventas.filter(v=>new Date(v.fecha)<=hasta)}
  if(metodoPago&&metodoPago!=='Todos')ventas=ventas.filter(v=>v.metodo_pago===metodoPago)
  if(usuarioId)ventas=ventas.filter(v=>v.usuario_id===usuarioId)
  if(soloFiado)ventas=ventas.filter(v=>v.es_fiado)
  if(busqueda&&busqueda.trim()){const q=busqueda.trim().toLowerCase();ventas=ventas.filter(v=>String(v.id).includes(q)||cl.find(c=>c.id===v.cliente_id)?.nombre.toLowerCase().includes(q)||(v.comprador_nombre&&v.comprador_nombre.toLowerCase().includes(q))||(v.comprador_dni_ruc&&v.comprador_dni_ruc.includes(q)))}
  ventas.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))
  const totalPeriodo=ventas.reduce((s,v)=>s+v.total,0)
  const cantidadTotal=ventas.length
  const totalPaginas=Math.ceil(ventas.length/porPagina)
  const inicio=(pagina-1)*porPagina
  return{ventas:ventas.slice(inicio,inicio+porPagina).map(v=>({...v,num_productos:data.detalle_ventas.filter(d=>d.venta_id===v.id).length,nombre_usuario:us.find(u=>u.id===v.usuario_id)?.nombre||'—',nombre_cliente:cl.find(c=>c.id===v.cliente_id)?.nombre||v.comprador_nombre||null})),totalPeriodo,cantidadTotal,totalPaginas,paginaActual:pagina}
}

// ─── VENTAS ───────────────────────────────────────────────────────
function realizarVenta(items, montoRecibido, metodoPago='Efectivo', descuento=0, tipoDescuento='ninguno', usuarioId=null, clienteId=null, esFiado=false, compradorNombre=null, compradorDniRuc=null) {
  const subtotalBruto=items.reduce((s,i)=>s+i.subtotal,0)
  let descuentoMonto=0
  if(tipoDescuento==='porcentaje')descuentoMonto=subtotalBruto*(descuento/100)
  else if(tipoDescuento==='monto')descuentoMonto=Math.min(descuento,subtotalBruto)
  const total=Math.max(subtotalBruto-descuentoMonto,0)
  const vuelto=(!esFiado&&metodoPago==='Efectivo')?montoRecibido-total:0
  const ventaId=data.nextId.ventas++

  // ── Número de comprobante ──
  const cfg=data.config
  const tipo=cfg.tipo_comprobante||'ticket'
  let numeroComprobante
  if(tipo==='boleta'||tipo==='nota_venta'){
    const serie=cfg.serie_boleta||'B001'
    if(!cfg.correlativo_actual)cfg.correlativo_actual=1
    numeroComprobante=`${serie}-${String(cfg.correlativo_actual).padStart(8,'0')}`
    cfg.correlativo_actual++
    save()
  } else {
    numeroComprobante=`#${String(ventaId).padStart(5,'0')}`
  }

  // ── Si el cliente existe, usar su nombre y DNI/RUC ──
  const clienteObj = clienteId ? data.clientes.find(c=>c.id===clienteId) : null
  const nombreComprador = compradorNombre || clienteObj?.nombre || null
  const dniRucComprador = compradorDniRuc || clienteObj?.dni_ruc || null

  data.ventas.push({
    id:ventaId, total, subtotal_bruto:subtotalBruto, descuento:descuentoMonto, tipo_descuento:tipoDescuento,
    monto_recibido:esFiado?0:montoRecibido, vuelto,
    metodo_pago:esFiado?'Fiado':metodoPago, usuario_id:usuarioId, cliente_id:clienteId||null, es_fiado:esFiado,
    tipo_comprobante: tipo, numero_comprobante: numeroComprobante,
    comprador_nombre: nombreComprador, comprador_dni_ruc: dniRucComprador,
    fecha:new Date().toISOString()
  })

  items.forEach(item=>{
    data.detalle_ventas.push({
      id:data.nextId.detalle_ventas++, venta_id:ventaId,
      producto_id:item.id, nombre_producto:item.nombre,
      precio_unitario:item.precio,
      precio_original:item.precioOriginal||null, // ← FIX: guardar precio original para reimpresión
      cantidad:item.cantidad, subtotal:item.subtotal,
      tipo_venta:item.tipo_venta||'unidad', unidad:item.unidad||'unidad',
    })
    const p=data.productos.find(p=>p.id===item.id)
    if(p)p.stock=Math.max(0,parseFloat(p.stock)-parseFloat(item.cantidad))
  })

  if(esFiado&&clienteId){
    const concepto=items.map(i=>i.tipo_venta==='granel'?`${i.nombre} ${i.cantidad}${i.unidad}`:`${i.nombre} x${i.cantidad}`).join(', ')
    addFiado({clienteId,monto:total,concepto,usuarioId})
  }

  // Si vino comprador nuevo (no es cliente registrado) y se quiere guardar
  if(compradorNombre&&!clienteId&&compradorDniRuc){
    // El guardado lo decide el frontend — aquí solo registramos en la venta
  }

  save()
  return{ventaId,total,subtotalBruto,descuentoMonto,vuelto,metodoPago:esFiado?'Fiado':metodoPago,numeroComprobante,tipoComprobante:tipo}
}

function getVentasHoy() { const hoy=new Date().toDateString();const us=data.usuarios,cl=data.clientes;return data.ventas.filter(v=>new Date(v.fecha).toDateString()===hoy).map(v=>({...v,num_productos:data.detalle_ventas.filter(d=>d.venta_id===v.id).length,nombre_usuario:us.find(u=>u.id===v.usuario_id)?.nombre||null,nombre_cliente:cl.find(c=>c.id===v.cliente_id)?.nombre||v.comprador_nombre||null})).reverse() }
function getResumenHoy() { const ventas=getVentasHoy();if(!ventas.length)return{total_ventas:0,ingresos:0,ticket_promedio:0,venta_maxima:0,descuentos:0,efectivo:0,yape:0,plin:0,tarjeta:0,fiado:0};const ingresos=ventas.filter(v=>!v.es_fiado).reduce((s,v)=>s+v.total,0);return{total_ventas:ventas.length,ingresos,ticket_promedio:ingresos/ventas.length,venta_maxima:Math.max(...ventas.map(v=>v.total)),descuentos:ventas.reduce((s,v)=>s+(v.descuento||0),0),efectivo:ventas.filter(v=>v.metodo_pago==='Efectivo').reduce((s,v)=>s+v.total,0),yape:ventas.filter(v=>v.metodo_pago==='Yape').reduce((s,v)=>s+v.total,0),plin:ventas.filter(v=>v.metodo_pago==='Plin').reduce((s,v)=>s+v.total,0),tarjeta:ventas.filter(v=>v.metodo_pago==='Tarjeta').reduce((s,v)=>s+v.total,0),fiado:ventas.filter(v=>v.es_fiado).reduce((s,v)=>s+v.total,0)} }

// ── getDetalleVenta: incluye precio_original para reimpresión ──
function getDetalleVenta(ventaId) { return data.detalle_ventas.filter(d=>d.venta_id===ventaId) }

// ─── ANALYTICS ────────────────────────────────────────────────────
function getVentasPorDias(dias) { const hoy=new Date();return Array.from({length:dias},(_,i)=>{const fecha=new Date(hoy);fecha.setDate(hoy.getDate()-(dias-1-i));const key=fecha.toDateString();const vd=data.ventas.filter(v=>new Date(v.fecha).toDateString()===key);return{fecha:fecha.toLocaleDateString('es-PE',{day:'2-digit',month:'short'}),ingresos:vd.reduce((s,v)=>s+v.total,0),ventas:vd.length,esHoy:i===dias-1}}) }
function getVentasPorMes() { const hoy=new Date();return Array.from({length:6},(_,i)=>{const fecha=new Date(hoy.getFullYear(),hoy.getMonth()-(5-i),1);const mes=fecha.getMonth(),anio=fecha.getFullYear();const vm=data.ventas.filter(v=>{const d=new Date(v.fecha);return d.getMonth()===mes&&d.getFullYear()===anio});return{fecha:fecha.toLocaleDateString('es-PE',{month:'short',year:'2-digit'}),ingresos:vm.reduce((s,v)=>s+v.total,0),ventas:vm.length,esActual:i===5}}) }
function getTopProductos(dias=7) { const desde=new Date();desde.setDate(desde.getDate()-dias);const ids=data.ventas.filter(v=>new Date(v.fecha)>=desde).map(v=>v.id);const mapa={};data.detalle_ventas.filter(d=>ids.includes(d.venta_id)).forEach(d=>{if(!mapa[d.nombre_producto])mapa[d.nombre_producto]={nombre:d.nombre_producto,cantidad:0,ingresos:0};mapa[d.nombre_producto].cantidad+=parseFloat(d.cantidad);mapa[d.nombre_producto].ingresos+=d.subtotal});return Object.values(mapa).sort((a,b)=>b.ingresos-a.ingresos).slice(0,8) }
function getResumenPeriodo(dias) { const desde=new Date();desde.setDate(desde.getDate()-dias);const ventas=data.ventas.filter(v=>new Date(v.fecha)>=desde);if(!ventas.length)return{total_ventas:0,ingresos:0,ticket_promedio:0,venta_maxima:0,descuentos:0,efectivo:0,yape:0,plin:0,tarjeta:0,fiado:0};const ingresos=ventas.filter(v=>!v.es_fiado).reduce((s,v)=>s+v.total,0);return{total_ventas:ventas.length,ingresos,ticket_promedio:ingresos/ventas.length,venta_maxima:Math.max(...ventas.map(v=>v.total)),descuentos:ventas.reduce((s,v)=>s+(v.descuento||0),0),efectivo:ventas.filter(v=>v.metodo_pago==='Efectivo').reduce((s,v)=>s+v.total,0),yape:ventas.filter(v=>v.metodo_pago==='Yape').reduce((s,v)=>s+v.total,0),plin:ventas.filter(v=>v.metodo_pago==='Plin').reduce((s,v)=>s+v.total,0),tarjeta:ventas.filter(v=>v.metodo_pago==='Tarjeta').reduce((s,v)=>s+v.total,0),fiado:ventas.filter(v=>v.es_fiado).reduce((s,v)=>s+v.total,0)} }

module.exports = {
  initDB,
  isSetupCompletado, completarSetup,
  verificarCodigoRecuperacion, resetearPassword, getAdmins,
  getProductos, getProductoByCodigo, addProducto, updateProducto, deleteProducto, reponerStock,
  importarProductosExcel,
  getProductosBajoStock, getConfig, updateConfig,
  login, getUsuarios, addUsuario, updateUsuario, deleteUsuario, cambiarPassword,
  abrirTurno, cerrarTurno, getTurnoActivo, getTurnos,
  getClientes, addCliente, updateCliente, deleteCliente, buscarCliente,
  getFiadoCliente, addFiado, pagarFiado, getResumenFiado,
  getOfertas, addOferta, deleteOferta,
  exportarBackup, importarBackup, getRutaBD, getDatosExcel,
  getHistorialVentas,
  realizarVenta, getVentasHoy, getResumenHoy, getDetalleVenta,
  getVentasPorDias, getVentasPorMes, getTopProductos, getResumenPeriodo,
}