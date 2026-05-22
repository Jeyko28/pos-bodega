import React, { useState, useEffect, useRef } from 'react'
import { useSesion } from '../App'
import VistaTicket from '../components/VistaTicket'

const fmt    = (n) => `S/ ${Number(n).toFixed(2)}`
const fmtKg  = (n) => `${parseFloat(n).toFixed(3).replace(/\.?0+$/, '')} kg`

const ICONOS = {
  'Todas':'🛒','Abarrotes':'🌾','Bebidas':'🥤','Snacks':'🍿','Panadería':'🍞','Lácteos':'🥛',
  'Limpieza':'🧹','Higiene':'🧴','Frutas':'🍎','Verduras':'🥦','Otros':'📦','General':'🏷️',
}

const METODOS = [
  { id:'Efectivo', label:'Efectivo', icon:'💵', color:'#10b981', desc:'Billetes y monedas' },
  { id:'Yape',     label:'Yape',     icon:'📱', color:'#7c3aed', desc:'Pago con Yape' },
  { id:'Plin',     label:'Plin',     icon:'📲', color:'#0ea5e9', desc:'Pago con Plin' },
  { id:'Tarjeta',  label:'Tarjeta',  icon:'💳', color:'#f59e0b', desc:'Débito o crédito' },
  { id:'Fiado',    label:'Fiado',    icon:'📋', color:'#ef4444', desc:'Pago pendiente' },
]

// Accesos rápidos de peso en kg
const PESOS_RAPIDOS = [0.25, 0.5, 1, 2, 5]

export default function POS() {
  const { usuario } = useSesion()

  const [productos, setProductos]           = useState([])
  const [ofertas, setOfertas]               = useState([])
  const [busqueda, setBusqueda]             = useState('')
  const [categoriaActiva, setCatActiva]     = useState('Todas')
  const [carrito, setCarrito]               = useState([])
  const [cargando, setCargando]             = useState(false)

  // Modal granel
  const [modalGranel, setModalGranel]       = useState(null) // producto seleccionado
  const [pesoInput, setPesoInput]           = useState('')
  const pesoRef                             = useRef(null)

  // Descuento
  const [modalDescuento, setModalDescuento] = useState(false)
  const [tipoDescuento, setTipoDescuento]   = useState('porcentaje')
  const [valorDescuento, setValorDescuento] = useState('')
  const [descuentoAplicado, setDescuentoAplicado] = useState(null)

  // Pago
  const [modalPago, setModalPago]           = useState(false)
  const [metodoPago, setMetodoPago]         = useState(null)
  const [montoRecibido, setMontoRecibido]   = useState('')

  // Fiado
  const [busquedaCliente, setBusquedaCliente]         = useState('')
  const [clientesFiado, setClientesFiado]             = useState([])
  const [clienteSelFiado, setClienteSelFiado]         = useState(null)
  const [inputClienteFocused, setInputClienteFocused] = useState(false)

  // Comprador SUNAT (para boletas > S/700)
  const [compradorNombre, setCompradorNombre]     = useState('')
  const [compradorDniRuc, setCompradorDniRuc]     = useState('')
  const [guardarCliente, setGuardarCliente]       = useState(false)
  const [mostrarComprador, setMostrarComprador]   = useState(false)

  // Ticket
  const [ventaRealizada, setVentaRealizada] = useState(null)
  const [config, setConfig]                 = useState({})
  const searchRef = useRef(null)

  useEffect(() => {
    cargarTodo()
    searchRef.current?.focus()
  }, [])

  async function cargarTodo() {
    const [prods, ofs, cfg] = await Promise.all([
      window.electronAPI.getProductos(),
      window.electronAPI.getOfertas(),
      window.electronAPI.getConfig(),
    ])
    setProductos(prods)
    setOfertas(ofs)
    setConfig(cfg)
  }

  useEffect(() => {
    if (busquedaCliente.trim().length >= 1) {
      window.electronAPI.buscarCliente(busquedaCliente).then(setClientesFiado)
    } else {
      window.electronAPI.getClientes().then(setClientesFiado)
    }
  }, [busquedaCliente])

  function getOfertaProducto(productoId) {
    return ofertas.find(o => o.producto_id === productoId) || null
  }

  function precioConOferta(producto) {
    const oferta = getOfertaProducto(producto.id)
    if (!oferta) return producto.precio
    if (oferta.tipo === 'porcentaje')  return producto.precio * (1 - oferta.valor / 100)
    if (oferta.tipo === 'precio_fijo') return oferta.valor
    return producto.precio
  }

  const categoriasConProductos = ['Todas', ...new Set(productos.map(p => p.categoria))]

  const productosFiltrados = productos.filter(p => {
    const matchB = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo && p.codigo.includes(busqueda))
    const matchC = categoriaActiva === 'Todas' || p.categoria === categoriaActiva
    return matchB && matchC
  })

  // ── Agregar producto al carrito ──────────────────────────────────
  function handleClickProducto(producto) {
    if (producto.stock <= 0) return
    if (producto.tipo_venta === 'granel') {
      // Granel: abrir modal de peso
      setPesoInput('')
      setModalGranel(producto)
      setTimeout(() => pesoRef.current?.focus(), 100)
    } else {
      // Unidad: agregar directo
      agregarUnidad(producto)
    }
    setBusqueda('')
    searchRef.current?.focus()
  }

  function agregarUnidad(producto) {
    const precio = precioConOferta(producto)
    const oferta = getOfertaProducto(producto.id)
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) return prev
        return prev.map(i => i.id === producto.id
          ? { ...i, cantidad: i.cantidad+1, subtotal: (i.cantidad+1)*precio }
          : i)
      }
      return [...prev, {
        ...producto,
        precio,
        precioOriginal: oferta ? producto.precio : null,
        oferta,
        cantidad: 1,
        subtotal: precio,
        tipo_venta: 'unidad',
        unidad: 'unidad',
      }]
    })
  }

  function agregarGranel() {
    if (!modalGranel) return
    const peso = parseFloat(pesoInput)
    if (isNaN(peso) || peso <= 0) return
    if (peso > modalGranel.stock) return

    const precio = precioConOferta(modalGranel)
    const oferta = getOfertaProducto(modalGranel.id)
    const subtotal = parseFloat((precio * peso).toFixed(2))

    setCarrito(prev => {
      // Para granel, cada entrada puede tener distinto peso — sumamos si ya existe
      const existe = prev.find(i => i.id === modalGranel.id && i.tipo_venta === 'granel')
      if (existe) {
        const nuevaCantidad = parseFloat((existe.cantidad + peso).toFixed(3))
        if (nuevaCantidad > modalGranel.stock) return prev
        return prev.map(i => i.id === modalGranel.id && i.tipo_venta === 'granel'
          ? { ...i, cantidad: nuevaCantidad, subtotal: parseFloat((i.precio * nuevaCantidad).toFixed(2)) }
          : i)
      }
      return [...prev, {
        ...modalGranel,
        precio,
        precioOriginal: oferta ? modalGranel.precio : null,
        oferta,
        cantidad:   peso,
        subtotal,
        tipo_venta: 'granel',
        unidad:     modalGranel.unidad || 'kg',
      }]
    })
    setModalGranel(null)
    setPesoInput('')
    searchRef.current?.focus()
  }

  function cambiarCantidadGranel(id, delta) {
    // Para granel, delta puede ser 0.1 o -0.1
    setCarrito(prev => prev
      .map(i => {
        if (i.id !== id || i.tipo_venta !== 'granel') return i
        const nuevaCantidad = parseFloat((i.cantidad + delta).toFixed(3))
        if (nuevaCantidad <= 0) return null
        return { ...i, cantidad: nuevaCantidad, subtotal: parseFloat((i.precio * nuevaCantidad).toFixed(2)) }
      })
      .filter(Boolean)
    )
  }

  function cambiarCantidad(id, delta) {
    setCarrito(prev => prev
      .map(i => i.id===id ? { ...i, cantidad:i.cantidad+delta, subtotal:(i.cantidad+delta)*i.precio } : i)
      .filter(i => i.cantidad > 0)
    )
  }

  // ── Cálculos ──────────────────────────────────────────────────────
  const subtotalBruto    = carrito.reduce((s,i) => s + (i.precioOriginal||i.precio) * i.cantidad, 0)
  const subtotalConOfertas = carrito.reduce((s,i) => s + i.subtotal, 0)

  const descuentoMonto = (() => {
    if (!descuentoAplicado) return 0
    if (descuentoAplicado.tipo==='porcentaje') return subtotalConOfertas*(descuentoAplicado.valor/100)
    if (descuentoAplicado.tipo==='monto')      return Math.min(descuentoAplicado.valor, subtotalConOfertas)
    return 0
  })()

  const totalConDescuento = Math.max(subtotalConOfertas - descuentoMonto, 0)
  const totalFiado        = subtotalBruto
  const vuelto            = parseFloat(montoRecibido) - totalConDescuento

  const ahorroOfertas = carrito.reduce((s,i) => {
    if (i.precioOriginal) return s + ((i.precioOriginal - i.precio) * i.cantidad)
    return s
  }, 0)

  function aplicarDescuento() {
    const val = parseFloat(valorDescuento)
    if (!val || val <= 0) return
    if (tipoDescuento==='porcentaje' && val > 100) return
    if (tipoDescuento==='monto' && val >= subtotalConOfertas) return
    setDescuentoAplicado({ tipo:tipoDescuento, valor:val })
    setModalDescuento(false)
    setValorDescuento('')
  }

  function abrirPago() {
    setMetodoPago(null); setMontoRecibido('')
    setClienteSelFiado(null); setBusquedaCliente('')
    setCompradorNombre(''); setCompradorDniRuc('')
    setGuardarCliente(false)
    const tipoComp = config.tipo_comprobante || 'ticket'
    setMostrarComprador(tipoComp !== 'ticket' && totalConDescuento >= 700)
    setModalPago(true)
  }

  async function handleCobrar() {
    if (!metodoPago) return
    if (metodoPago==='Efectivo' && (isNaN(parseFloat(montoRecibido)) || parseFloat(montoRecibido) < totalConDescuento)) return
    if (metodoPago==='Fiado' && !clienteSelFiado) return

    setCargando(true)
    try {
      const esFiado    = metodoPago === 'Fiado'
      const montoFinal = esFiado ? totalFiado : (metodoPago==='Efectivo' ? parseFloat(montoRecibido) : totalConDescuento)
      const itemsVenta = esFiado
        ? carrito.map(i => ({ ...i, precio: i.precioOriginal||i.precio, subtotal: parseFloat(((i.precioOriginal||i.precio)*i.cantidad).toFixed(2)) }))
        : carrito

      // Datos del comprador — si hay cliente fiado, usar sus datos
      const nombreFinal = clienteSelFiado?.nombre || compradorNombre.trim() || null
      const dniFinal    = clienteSelFiado?.dni_ruc || compradorDniRuc.trim() || null

      const result = await window.electronAPI.realizarVenta({
        items:              itemsVenta,
        montoRecibido:      montoFinal,
        metodoPago,
        descuento:          esFiado ? 0 : (descuentoAplicado?.valor || 0),
        tipoDescuento:      esFiado ? 'ninguno' : (descuentoAplicado?.tipo || 'ninguno'),
        usuarioId:          usuario?.id || null,
        clienteId:          clienteSelFiado?.id || null,
        esFiado,
        compradorNombre:    nombreFinal,
        compradorDniRuc:    dniFinal,
        guardarCliente:     guardarCliente && !clienteSelFiado,
      })

      const itemsTicket = itemsVenta.map(i => ({
        nombre_producto: i.nombre,
        cantidad:        i.cantidad,
        precio_unitario: esFiado ? (i.precioOriginal||i.precio) : i.precio,
        precio:          esFiado ? (i.precioOriginal||i.precio) : i.precio,
        precioOriginal:  esFiado ? null : (i.precioOriginal || null),
        oferta:          esFiado ? null : (i.oferta || null),
        subtotal:        i.subtotal,
        tipo_venta:      i.tipo_venta || 'unidad',
        unidad:          i.unidad     || 'unidad',
      }))

      setVentaRealizada({
        id:               result.ventaId,
        total:            result.total,
        subtotal_bruto:   result.subtotalBruto,
        descuento:        result.descuentoMonto,
        tipo_descuento:   esFiado ? 'ninguno' : (descuentoAplicado?.tipo || 'ninguno'),
        vuelto:           result.vuelto,
        monto_recibido:   montoFinal,
        metodo_pago:      metodoPago,
        cliente:          clienteSelFiado?.nombre || null,
        es_fiado:         esFiado,
        fecha:            new Date().toISOString(),
        items:            itemsTicket,
        tipo_comprobante: result.tipoComprobante,
        numero_comprobante: result.numeroComprobante,
        comprador_nombre: nombreFinal,
        comprador_dni_ruc: dniFinal,
      })

      setCarrito([]); setDescuentoAplicado(null)
      setMontoRecibido(''); setMetodoPago(null)
      setClienteSelFiado(null); setBusquedaCliente('')
      setCompradorNombre(''); setCompradorDniRuc('')
      setGuardarCliente(false); setMostrarComprador(false)
      setModalPago(false)
      await cargarTodo()
    } catch(e) { console.error(e) }
    setCargando(false)
  }

  function imprimirTicket() {
    const contenido = document.getElementById('ticket-imprimible')
    if (!contenido) return
    const w = window.open('', '_blank', 'width:420,height:620')
    w.document.write(`<html><head><title>Ticket</title><style>body{margin:0;padding:10px;font-family:'Courier New',monospace;}@media print{body{margin:0;}}</style></head><body>${contenido.outerHTML}</body></html>`)
    w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const metodoActivo = METODOS.find(m => m.id === metodoPago)

  // Label de cantidad según tipo
  function labelCantidad(item) {
    if (item.tipo_venta === 'granel') {
      const c = parseFloat(item.cantidad)
      return `${c % 1 === 0 ? c.toFixed(0) : c.toFixed(3).replace(/0+$/, '')} ${item.unidad}`
    }
    return `${item.cantidad}`
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* Panel Izquierdo */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:20, gap:14, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700 }}>Punto de Venta</h1>
            <p className="text-muted" style={{ fontSize:13 }}>
              {new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}
              {ofertas.length>0 && <span style={{ color:'#34d399', marginLeft:8 }}>· 🏷️ {ofertas.length} oferta{ofertas.length>1?'s':''} activa{ofertas.length>1?'s':''}</span>}
            </p>
          </div>
          {ventaRealizada && !modalPago && (
            <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:10, padding:'8px 14px', fontSize:13, color:'#34d399', display:'flex', alignItems:'center', gap:10 }}>
              ✓ Venta #{ventaRealizada.id} · {ventaRealizada.metodo_pago}
              {ventaRealizada.cliente && <span style={{ color:'#637a93' }}>· {ventaRealizada.cliente}</span>}
              <button onClick={() => setVentaRealizada(v=>({...v,_showTicket:true}))}
                style={{ background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:8, padding:'3px 10px', cursor:'pointer', color:'#34d399', fontSize:12, fontWeight:600 }}>
                🖨️ Ticket
              </button>
            </div>
          )}
        </div>

        {/* Buscador */}
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={searchRef} className="input" style={{ paddingLeft:42, fontSize:15 }}
            placeholder="Buscar producto o escanear código de barras..."
            value={busqueda} onChange={e => { setBusqueda(e.target.value); setCatActiva('Todas') }}
            onKeyDown={e => { if (e.key==='Enter' && productosFiltrados.length===1) handleClickProducto(productosFiltrados[0]) }} />
          {busqueda && <button onClick={() => { setBusqueda(''); searchRef.current?.focus() }} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18 }}>✕</button>}
        </div>

        {/* Filtros categoría */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, flexShrink:0 }}>
          {categoriasConProductos.map(cat => {
            const isActive = categoriaActiva===cat
            const count    = cat==='Todas' ? productos.length : productos.filter(p=>p.categoria===cat).length
            return (
              <button key={cat} onClick={() => { setCatActiva(cat); setBusqueda('') }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:999, flexShrink:0,
                  border: isActive ? '1px solid rgba(16,185,129,0.6)' : '1px solid var(--border)',
                  background: isActive ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)',
                  color: isActive ? '#34d399' : '#637a93', cursor:'pointer',
                  fontSize:13, fontWeight:isActive?700:500, whiteSpace:'nowrap', transition:'all 0.15s' }}>
                <span>{ICONOS[cat]||'📦'}</span><span>{cat}</span>
                <span style={{ background:isActive?'rgba(16,185,129,0.25)':'var(--bg-700)', color:isActive?'#34d399':'#637a93', borderRadius:999, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Grid productos */}
        <div style={{ flex:1, overflowY:'auto', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:12, alignContent:'start' }}>
          {productosFiltrados.map(p => {
            const oferta      = getOfertaProducto(p.id)
            const precioFinal = precioConOferta(p)
            const tieneOferta = !!oferta
            const esGranel    = p.tipo_venta === 'granel'
            return (
              <button key={p.id} onClick={() => handleClickProducto(p)} disabled={p.stock<=0}
                style={{ background: p.stock<=0?'rgba(22,32,48,0.5)':'var(--bg-card)',
                  border: tieneOferta ? '1px solid rgba(16,185,129,0.5)' : esGranel ? '1px solid rgba(14,165,233,0.3)' : '1px solid var(--border)',
                  borderRadius:12, padding:14, textAlign:'left', cursor:p.stock<=0?'not-allowed':'pointer',
                  transition:'all 0.15s', opacity:p.stock<=0?0.5:1, position:'relative' }}
                onMouseEnter={e => { if(p.stock>0) e.currentTarget.style.borderColor='#10b981' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=tieneOferta?'rgba(16,185,129,0.5)':esGranel?'rgba(14,165,233,0.3)':'var(--border)' }}>

                {/* Badge oferta */}
                {tieneOferta && (
                  <div style={{ position:'absolute', top:8, right:8, background:'#10b981', color:'white', borderRadius:999, padding:'2px 7px', fontSize:10, fontWeight:800 }}>
                    {oferta.tipo==='porcentaje' ? `-${oferta.valor}%` : '🏷️'}
                  </div>
                )}
                {/* Badge granel */}
                {esGranel && !tieneOferta && (
                  <div style={{ position:'absolute', top:8, right:8, background:'rgba(14,165,233,0.2)', color:'#38bdf8', borderRadius:999, padding:'2px 7px', fontSize:10, fontWeight:800 }}>
                    ⚖️
                  </div>
                )}

                <div style={{ fontSize:11, color:'#637a93', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>
                  {ICONOS[p.categoria]||'📦'} {p.categoria}
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:8, lineHeight:1.3, paddingRight:32 }}>{p.nombre}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                  <div>
                    <span style={{ fontSize:17, fontWeight:700, color:'#10b981', fontFamily:'JetBrains Mono,monospace' }}>{fmt(precioFinal)}</span>
                    {esGranel && <span style={{ fontSize:11, color:'#637a93' }}>/{p.unidad}</span>}
                    {tieneOferta && (
                      <div style={{ fontSize:11, color:'#637a93', textDecoration:'line-through', fontFamily:'JetBrains Mono' }}>{fmt(p.precio)}</div>
                    )}
                  </div>
                  <span style={{ fontSize:11, color:p.stock<(esGranel?1:5)?'#f59e0b':'#637a93' }}>
                    {p.stock<=0 ? 'Sin stock' : esGranel ? `${parseFloat(p.stock).toFixed(1)} ${p.unidad}` : `${p.stock} uds`}
                  </span>
                </div>
              </button>
            )
          })}
          {productosFiltrados.length===0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#637a93' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>{busqueda?'🔍':ICONOS[categoriaActiva]||'📦'}</div>
              <p>{busqueda?`No se encontró "${busqueda}"`:`No hay productos en ${categoriaActiva}`}</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho: Carrito */}
      <div style={{ width:340, borderLeft:'1px solid var(--border)', background:'#0d1520', display:'flex', flexDirection:'column', padding:20, gap:16, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>
            Carrito {carrito.length>0 && <span style={{ color:'#10b981', fontFamily:'JetBrains Mono' }}>({carrito.reduce((s,i)=>s+i.cantidad,0)})</span>}
          </h2>
          {carrito.length>0 && <button className="btn btn-ghost" style={{ padding:'5px 12px', fontSize:12 }} onClick={() => { setCarrito([]); setDescuentoAplicado(null) }}>Limpiar</button>}
        </div>

        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          {carrito.length===0 ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#637a93', gap:10 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.4 }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <p style={{ fontSize:14 }}>El carrito está vacío</p>
              <p style={{ fontSize:12, opacity:0.6 }}>Agrega productos desde el panel</p>
            </div>
          ) : carrito.map(item => (
            <div key={`${item.id}-${item.tipo_venta}`}
              style={{ background:'var(--bg-card)', border:`1px solid ${item.oferta?'rgba(16,185,129,0.2)':item.tipo_venta==='granel'?'rgba(14,165,233,0.2)':'var(--border)'}`, borderRadius:10, padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:600, lineHeight:1.3 }}>{item.nombre}</span>
                  {item.oferta && <span style={{ marginLeft:6, fontSize:10, background:'rgba(16,185,129,0.15)', color:'#34d399', borderRadius:999, padding:'1px 6px', fontWeight:700 }}>🏷️ OFERTA</span>}
                  {item.tipo_venta==='granel' && <span style={{ marginLeft:6, fontSize:10, background:'rgba(14,165,233,0.15)', color:'#38bdf8', borderRadius:999, padding:'1px 6px', fontWeight:700 }}>⚖️ GRANEL</span>}
                </div>
                <button onClick={() => setCarrito(prev=>prev.filter(i=>!(i.id===item.id&&i.tipo_venta===item.tipo_venta)))} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', padding:'0 0 0 8px', fontSize:16 }}>✕</button>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {item.tipo_venta==='granel' ? (
                  // Controles granel: -0.1 / peso / +0.1
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button onClick={() => cambiarCantidadGranel(item.id, -0.1)}
                      style={{ width:26, height:26, borderRadius:6, background:'var(--bg-700)', border:'1px solid var(--border)', color:'var(--text)', cursor:'pointer', fontSize:13 }}>−</button>
                    <span style={{ fontFamily:'JetBrains Mono', fontWeight:600, fontSize:13, minWidth:52, textAlign:'center' }}>
                      {labelCantidad(item)}
                    </span>
                    <button onClick={() => cambiarCantidadGranel(item.id, 0.1)}
                      style={{ width:26, height:26, borderRadius:6, background:'var(--bg-700)', border:'1px solid var(--border)', color:'var(--text)', cursor:'pointer', fontSize:13 }}>+</button>
                  </div>
                ) : (
                  // Controles unidad: -1 / cantidad / +1
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => cambiarCantidad(item.id,-1)} style={{ width:26, height:26, borderRadius:6, background:'var(--bg-700)', border:'1px solid var(--border)', color:'var(--text)', cursor:'pointer', fontSize:15 }}>−</button>
                    <span style={{ fontFamily:'JetBrains Mono', fontWeight:600, fontSize:14, minWidth:24, textAlign:'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.id,1)} style={{ width:26, height:26, borderRadius:6, background:'var(--bg-700)', border:'1px solid var(--border)', color:'var(--text)', cursor:'pointer', fontSize:15 }}>+</button>
                  </div>
                )}
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:15, color:'#10b981' }}>{fmt(item.subtotal)}</div>
                  {item.tipo_venta==='granel' && <div style={{ fontSize:10, color:'#637a93' }}>{fmt(item.precio)}/{item.unidad}</div>}
                  {item.precioOriginal && item.tipo_venta!=='granel' && <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#637a93', textDecoration:'line-through' }}>{fmt(item.precioOriginal*item.cantidad)}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {carrito.length>0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', flexDirection:'column', gap:6 }}>
              {ahorroOfertas>0 && (
                <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:8, padding:'6px 10px', display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'#34d399' }}>🏷️ Ahorro por ofertas</span>
                  <span style={{ fontFamily:'JetBrains Mono', color:'#34d399', fontWeight:700 }}>−{fmt(ahorroOfertas)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#637a93' }}>
                <span>Subtotal</span>
                <span style={{ fontFamily:'JetBrains Mono' }}>{fmt(subtotalConOfertas)}</span>
              </div>
              {descuentoAplicado && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'6px 10px' }}>
                  <span style={{ fontSize:13, color:'#f59e0b', fontWeight:600 }}>
                    🏷️ Dto. {descuentoAplicado.tipo==='porcentaje'?`${descuentoAplicado.valor}%`:fmt(descuentoAplicado.valor)}
                  </span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'JetBrains Mono', color:'#f59e0b', fontWeight:700, fontSize:13 }}>−{fmt(descuentoMonto)}</span>
                    <button onClick={() => setDescuentoAplicado(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:14 }}>✕</button>
                  </div>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:4 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#637a93' }}>TOTAL</span>
                <span style={{ fontFamily:'JetBrains Mono', fontSize:26, fontWeight:800, color:'#34d399' }}>{fmt(totalConDescuento)}</span>
              </div>
            </div>
            {!descuentoAplicado && (
              <button className="btn btn-ghost" style={{ width:'100%', fontSize:13 }} onClick={() => setModalDescuento(true)}>
                🏷️ Aplicar descuento
              </button>
            )}
            <button className="btn btn-primary" style={{ width:'100%', padding:'14px', fontSize:16, borderRadius:12 }} onClick={abrirPago}>
              💳 Seleccionar método de pago
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Granel ── */}
      {modalGranel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#111d2b', border:'1px solid rgba(14,165,233,0.4)', borderRadius:20, padding:28, width:400, display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>⚖️ {modalGranel.nombre}</h2>
                <p style={{ color:'#637a93', fontSize:13, marginTop:2 }}>
                  {fmt(precioConOferta(modalGranel))} por {modalGranel.unidad}
                  {' · '}Stock: {parseFloat(modalGranel.stock).toFixed(2)} {modalGranel.unidad}
                </p>
              </div>
              <button onClick={() => setModalGranel(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>

            {/* Input de peso */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'#637a93', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>
                Cantidad ({modalGranel.unidad})
              </label>
              <div style={{ position:'relative' }}>
                <input ref={pesoRef} className="input" type="number" min="0.001" step="0.001"
                  placeholder={`Ej: 0.500`} value={pesoInput}
                  onChange={e => setPesoInput(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') agregarGranel() }}
                  style={{ fontFamily:'JetBrains Mono', fontSize:28, fontWeight:700, textAlign:'right', paddingRight:50 }} />
                <span style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', color:'#637a93', fontWeight:700, fontSize:16 }}>
                  {modalGranel.unidad}
                </span>
              </div>
            </div>

            {/* Accesos rápidos de peso */}
            <div>
              <p style={{ fontSize:11, color:'#637a93', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5, fontWeight:700 }}>
                Pesos rápidos
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {PESOS_RAPIDOS.map(p => (
                  <button key={p} onClick={() => setPesoInput(String(p))} className="btn btn-ghost"
                    style={{ fontSize:13, padding:'6px 12px' }}>
                    {p} {modalGranel.unidad}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview del total */}
            {pesoInput && !isNaN(parseFloat(pesoInput)) && parseFloat(pesoInput) > 0 && (
              <div style={{ background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:12, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:13, color:'#38bdf8', fontWeight:600 }}>Total a cobrar</p>
                  <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>
                    {parseFloat(pesoInput).toFixed(3)} {modalGranel.unidad} × {fmt(precioConOferta(modalGranel))}
                  </p>
                </div>
                <span style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:22, color:'#38bdf8' }}>
                  {fmt(precioConOferta(modalGranel) * parseFloat(pesoInput))}
                </span>
              </div>
            )}

            {parseFloat(pesoInput) > modalGranel.stock && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>
                ⚠️ No hay suficiente stock. Disponible: {parseFloat(modalGranel.stock).toFixed(2)} {modalGranel.unidad}
              </div>
            )}

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModalGranel(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1, background:'#0ea5e9' }}
                onClick={agregarGranel}
                disabled={!pesoInput || isNaN(parseFloat(pesoInput)) || parseFloat(pesoInput)<=0 || parseFloat(pesoInput)>modalGranel.stock}>
                ✓ Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Descuento */}
      {modalDescuento && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:400, display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>🏷️ Aplicar descuento</h2>
                <p style={{ color:'#637a93', fontSize:13, marginTop:2 }}>Subtotal: <strong style={{ color:'var(--text)', fontFamily:'JetBrains Mono' }}>{fmt(subtotalConOfertas)}</strong></p>
              </div>
              <button onClick={() => setModalDescuento(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[{ id:'porcentaje',label:'Porcentaje',icon:'%',desc:'Ej: 10% de descuento' },{ id:'monto',label:'Monto fijo',icon:'S/',desc:'Ej: S/ 5 de descuento' }].map(t => {
                const isActive = tipoDescuento===t.id
                return (
                  <button key={t.id} onClick={() => { setTipoDescuento(t.id); setValorDescuento('') }}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 10px', borderRadius:12, cursor:'pointer', border:isActive?'2px solid #10b981':'2px solid var(--border)', background:isActive?'rgba(16,185,129,0.1)':'var(--bg-card)', transition:'all 0.15s' }}>
                    <span style={{ fontSize:24, fontWeight:800, fontFamily:'JetBrains Mono', color:isActive?'#34d399':'#637a93' }}>{t.icon}</span>
                    <span style={{ fontWeight:700, fontSize:14, color:isActive?'#34d399':'var(--text)' }}>{t.label}</span>
                    <span style={{ fontSize:11, color:'#637a93' }}>{t.desc}</span>
                  </button>
                )
              })}
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'#637a93', display:'block', marginBottom:6 }}>{tipoDescuento==='porcentaje'?'PORCENTAJE (1-100%)':'MONTO A DESCONTAR'}</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93', fontFamily:'JetBrains Mono', fontWeight:700, fontSize:16 }}>{tipoDescuento==='porcentaje'?'%':'S/'}</span>
                <input className="input" type="number" autoFocus min="0.1"
                  max={tipoDescuento==='porcentaje'?100:subtotalConOfertas-0.01}
                  placeholder={tipoDescuento==='porcentaje'?'10':'5.00'}
                  value={valorDescuento} onChange={e => setValorDescuento(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') aplicarDescuento() }}
                  style={{ paddingLeft:36, fontFamily:'JetBrains Mono', fontSize:20, fontWeight:700, textAlign:'right' }} />
              </div>
              {valorDescuento && !isNaN(parseFloat(valorDescuento)) && parseFloat(valorDescuento)>0 && (
                <div style={{ marginTop:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:'#f59e0b' }}>Descuento</span>
                  <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'#f59e0b', fontSize:15 }}>
                    −{fmt(tipoDescuento==='porcentaje'?subtotalConOfertas*(parseFloat(valorDescuento)/100):Math.min(parseFloat(valorDescuento),subtotalConOfertas))}
                  </span>
                </div>
              )}
            </div>
            {tipoDescuento==='porcentaje' && (
              <div>
                <p style={{ fontSize:11, color:'#637a93', marginBottom:8 }}>VALORES RÁPIDOS</p>
                <div style={{ display:'flex', gap:8 }}>
                  {[5,10,15,20,25,50].map(v => (
                    <button key={v} onClick={() => setValorDescuento(String(v))} className="btn btn-ghost" style={{ flex:1, padding:'6px 4px', fontSize:13 }}>{v}%</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => { setModalDescuento(false); setValorDescuento('') }}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={aplicarDescuento}
                disabled={!valorDescuento||isNaN(parseFloat(valorDescuento))||parseFloat(valorDescuento)<=0}>✓ Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago */}
      {modalPago && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:480, display:'flex', flexDirection:'column', gap:18, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>Método de Pago</h2>
                <p style={{ color:'#637a93', fontSize:13, marginTop:2 }}>
                  Total: <strong style={{ color:'#34d399', fontFamily:'JetBrains Mono' }}>{fmt(totalConDescuento)}</strong>
                  {metodoPago==='Fiado' && <span style={{ color:'#ef4444', marginLeft:8, fontSize:12 }}>· Fiado: {fmt(totalFiado)} (precio real)</span>}
                </p>
              </div>
              <button onClick={() => setModalPago(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {METODOS.map(m => {
                const isSelected = metodoPago===m.id
                return (
                  <button key={m.id} onClick={() => { setMetodoPago(m.id); setMontoRecibido(''); setClienteSelFiado(null); setBusquedaCliente('') }}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 10px', borderRadius:14, cursor:'pointer',
                      border:isSelected?`2px solid ${m.color}`:'2px solid var(--border)',
                      background:isSelected?`${m.color}22`:'var(--bg-card)', transition:'all 0.15s' }}>
                    <span style={{ fontSize:26 }}>{m.icon}</span>
                    <span style={{ fontWeight:700, fontSize:14, color:isSelected?m.color:'var(--text)' }}>{m.label}</span>
                    <span style={{ fontSize:11, color:'#637a93', textAlign:'center' }}>{m.desc}</span>
                  </button>
                )
              })}
            </div>
            {metodoPago==='Efectivo' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:'#637a93', display:'block', marginBottom:6 }}>MONTO RECIBIDO</label>
                  <input className="input" type="number" placeholder="0.00" value={montoRecibido} autoFocus
                    onChange={e => setMontoRecibido(e.target.value)}
                    style={{ fontFamily:'JetBrains Mono', fontSize:20, fontWeight:700, textAlign:'right' }} />
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {[5,10,20,50,100].map(m => <button key={m} onClick={() => setMontoRecibido(String(m))} className="btn btn-ghost" style={{ flex:1, padding:'6px 4px', fontSize:13 }}>S/{m}</button>)}
                </div>
                {montoRecibido && !isNaN(parseFloat(montoRecibido)) && (
                  <div style={{ background:vuelto>=0?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${vuelto>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:14, fontWeight:600, color:vuelto>=0?'#34d399':'#ef4444' }}>{vuelto>=0?'Vuelto':'Falta'}</span>
                    <span style={{ fontFamily:'JetBrains Mono', fontSize:22, fontWeight:800, color:vuelto>=0?'#34d399':'#ef4444' }}>{fmt(Math.abs(vuelto))}</span>
                  </div>
                )}
              </div>
            )}
            {(metodoPago==='Yape'||metodoPago==='Plin') && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{ width:120, height:120, background:'white', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:56 }}>📱</div>
                <p style={{ textAlign:'center', fontSize:13, color:'#637a93' }}>Monto exacto: <strong style={{ color:'#34d399', fontFamily:'JetBrains Mono' }}>{fmt(totalConDescuento)}</strong></p>
              </div>
            )}
            {metodoPago==='Tarjeta' && (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:'16px 20px', display:'flex', gap:14, alignItems:'center' }}>
                <span style={{ fontSize:32 }}>💳</span>
                <div>
                  <p style={{ fontWeight:700, fontSize:14 }}>Pago con tarjeta</p>
                  <p style={{ color:'#637a93', fontSize:13, marginTop:4 }}>Cobrar <strong style={{ color:'#f59e0b', fontFamily:'JetBrains Mono' }}>{fmt(totalConDescuento)}</strong> en el POS físico</p>
                </div>
              </div>
            )}
            {metodoPago==='Fiado' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#ef4444' }}>
                  ⚠️ El fiado se cobra al <strong>precio real</strong> — sin descuentos ni ofertas.
                </div>
                <div style={{ background:'var(--bg-700)', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'#637a93' }}>Deuda a registrar (precio real)</span>
                  <span style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:18, color:'#ef4444' }}>{fmt(totalFiado)}</span>
                </div>
                <div style={{ position:'relative' }}>
                  <label style={{ fontSize:12, fontWeight:700, color:'#637a93', display:'block', marginBottom:6 }}>CLIENTE</label>
                  <div style={{ position:'relative' }}>
                    <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93', pointerEvents:'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input className="input" style={{ paddingLeft:40 }}
                      placeholder="Buscar cliente..." value={busquedaCliente}
                      onChange={e => { setBusquedaCliente(e.target.value); setClienteSelFiado(null) }}
                      onFocus={() => setInputClienteFocused(true)}
                      onBlur={() => setTimeout(() => setInputClienteFocused(false), 200)} autoFocus />
                  </div>
                  {(inputClienteFocused||busquedaCliente) && !clienteSelFiado && clientesFiado.length>0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--bg-700)', border:'1px solid var(--border)', borderRadius:10, marginTop:4, maxHeight:180, overflowY:'auto', zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                      {clientesFiado.map((c,i) => (
                        <button key={c.id} onMouseDown={() => { setClienteSelFiado(c); setBusquedaCliente(c.nombre); setInputClienteFocused(false) }}
                          style={{ width:'100%', background:'none', border:'none', padding:'10px 14px', textAlign:'left', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:i<clientesFiado.length-1?'1px solid rgba(30,51,71,0.5)':'none' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}>
                          <div>
                            <p style={{ fontSize:14, fontWeight:600 }}>{c.nombre}</p>
                            <p style={{ fontSize:11, color:'#637a93' }}>{c.telefono||'Sin teléfono'}</p>
                          </div>
                          {c.deuda_total>0 && <span style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'#ef4444', fontWeight:700 }}>S/{c.deuda_total.toFixed(2)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {clienteSelFiado && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontWeight:700, fontSize:14 }}>📋 {clienteSelFiado.nombre}</p>
                      <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>
                        {clienteSelFiado.telefono||'Sin teléfono'}
                        {clienteSelFiado.deuda_total>0 && <span style={{ color:'#ef4444', marginLeft:8 }}>· Deuda: {fmt(clienteSelFiado.deuda_total)}</span>}
                      </p>
                    </div>
                    <button onClick={() => { setClienteSelFiado(null); setBusquedaCliente('') }} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18 }}>✕</button>
                  </div>
                )}
              </div>
            )}
            {/* ── Datos del comprador SUNAT (boleta > S/700) ── */}
            {mostrarComprador && metodoPago && metodoPago !== 'Fiado' && (
              <div style={{ background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:13, color:'#38bdf8' }}>📋 Datos del comprador</p>
                    <p style={{ fontSize:11, color:'#637a93', marginTop:2 }}>Requerido por SUNAT para boletas ≥ S/ 700</p>
                  </div>
                  <button type="button" onClick={() => setMostrarComprador(false)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:14 }}>✕</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#637a93', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Nombre / Razón social</label>
                    <input className="input" placeholder="Ej: Juan Pérez García"
                      value={compradorNombre} onChange={e => setCompradorNombre(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#637a93', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>DNI / RUC</label>
                    <input className="input" style={{ fontFamily:'JetBrains Mono' }}
                      placeholder="Ej: 45678901"
                      value={compradorDniRuc} onChange={e => setCompradorDniRuc(e.target.value)} />
                  </div>
                  <div onClick={() => setGuardarCliente(v => !v)}
                    style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', padding:'8px 0' }}>
                    <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${guardarCliente?'#10b981':'#637a93'}`, background:guardarCliente?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                      {guardarCliente && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize:13, color:'#637a93' }}>Guardar este cliente en la sección Clientes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso si es boleta > S/700 y no se ha mostrado el formulario */}
            {!mostrarComprador && metodoPago && metodoPago !== 'Fiado' && (config.tipo_comprobante === 'boleta' || config.tipo_comprobante === 'nota_venta') && totalConDescuento >= 700 && (
              <button type="button" onClick={() => setMostrarComprador(true)}
                style={{ background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:10, padding:'10px 14px', cursor:'pointer', textAlign:'left', fontSize:13, color:'#38bdf8' }}>
                📋 Agregar datos del comprador (SUNAT requiere DNI/RUC para boletas ≥ S/700)
              </button>
            )}

            {metodoPago && (
              <button className="btn btn-primary"
                style={{ width:'100%', padding:'14px', fontSize:16, borderRadius:12, background:metodoActivo?.color }}
                onClick={handleCobrar}
                disabled={cargando||(metodoPago==='Efectivo'&&(!montoRecibido||isNaN(parseFloat(montoRecibido))||parseFloat(montoRecibido)<totalConDescuento))||(metodoPago==='Fiado'&&!clienteSelFiado)}>
                {cargando ? 'Procesando...' :
                  metodoPago==='Fiado'
                    ? `📋 Registrar fiado — ${fmt(totalFiado)}`
                    : `✓ Confirmar pago — ${fmt(totalConDescuento)}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Ticket */}
      {ventaRealizada?._showTicket && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:24, width:500, maxHeight:'90vh', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>🖨️ Vista previa del ticket</h2>
              <button onClick={() => setVentaRealizada(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', background:'#f5f5f5', borderRadius:12, padding:16, display:'flex', justifyContent:'center' }}>
              <VistaTicket venta={ventaRealizada} config={config} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setVentaRealizada(null)}>Cerrar</button>
              <button className="btn btn-primary" style={{ flex:1, fontSize:15 }} onClick={imprimirTicket}>🖨️ Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}