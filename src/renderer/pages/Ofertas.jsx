import React, { useState, useEffect } from 'react'

const fmt = (n) => `S/ ${Number(n||0).toFixed(2)}`

const ICONOS = {
  'Bebidas':'🥤','Snacks':'🍿','Panadería':'🍞','Lácteos':'🥛',
  'Limpieza':'🧹','Higiene':'🧴','Frutas':'🍎','Verduras':'🥦',
  'Otros':'📦','General':'🏷️',
}

export default function Ofertas() {
  const [ofertas, setOfertas]           = useState([])
  const [productos, setProductos]       = useState([])
  const [modal, setModal]               = useState(false)
  const [busqueda, setBusqueda]         = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [guardando, setGuardando]       = useState(false)
  const [form, setForm]                 = useState({ productoId:null, tipo:'porcentaje', valor:'', descripcion:'', fechaFin:'' })
  const [productoSel, setProductoSel]   = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [o, p] = await Promise.all([
      window.electronAPI.getOfertas(),
      window.electronAPI.getProductos(),
    ])
    setOfertas(o)
    setProductos(p)
  }

  // Si hay búsqueda filtra, si no muestra todos
  const productosFiltrados = busqueda.trim()
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busqueda.toLowerCase())
      )
    : productos

  function seleccionarProducto(p) {
    setProductoSel(p)
    setForm(f => ({ ...f, productoId:p.id }))
    setBusqueda(p.nombre)
    setInputFocused(false)
  }

  async function guardar() {
    if (!form.productoId || !form.valor || parseFloat(form.valor) <= 0) return
    setGuardando(true)
    await window.electronAPI.addOferta({
      productoId:  form.productoId,
      tipo:        form.tipo,
      valor:       parseFloat(form.valor),
      descripcion: form.descripcion || null,
      fechaFin:    form.fechaFin || null,
    })
    setGuardando(false)
    setModal(false)
    resetForm()
    cargar()
  }

  function resetForm() {
    setForm({ productoId:null, tipo:'porcentaje', valor:'', descripcion:'', fechaFin:'' })
    setProductoSel(null)
    setBusqueda('')
    setInputFocused(false)
  }

  async function eliminar(id) {
    await window.electronAPI.deleteOferta(id)
    cargar()
  }

  function precioConOferta(oferta) {
    if (oferta.tipo === 'porcentaje')  return oferta.producto.precio * (1 - oferta.valor / 100)
    if (oferta.tipo === 'precio_fijo') return oferta.valor
    return oferta.producto.precio
  }

  function descuentoLabel(oferta) {
    if (oferta.tipo === 'porcentaje')  return `-${oferta.valor}%`
    if (oferta.tipo === 'precio_fijo') return 'Precio fijo'
    return ''
  }

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'24px 24px 16px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Ofertas del día</h1>
          <p className="text-muted" style={{ fontSize:13 }}>
            {ofertas.length === 0 ? 'No hay ofertas activas' : `${ofertas.length} oferta${ofertas.length>1?'s':''} activa${ofertas.length>1?'s':''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setModal(true) }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva oferta
        </button>
      </div>

      {/* Grid de ofertas */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 24px 24px' }}>
        {ofertas.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16, color:'#637a93' }}>
            <div style={{ width:72, height:72, background:'rgba(16,185,129,0.08)', border:'2px dashed rgba(16,185,129,0.2)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🏷️</div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>Sin ofertas activas</p>
              <p style={{ fontSize:13, marginTop:6 }}>Crea una oferta para destacar productos con precio especial</p>
            </div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModal(true) }}>+ Crear primera oferta</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:14 }}>
            {ofertas.map(o => {
              const pConOferta = precioConOferta(o)
              const ahorro     = o.producto.precio - pConOferta
              const vence      = o.fecha_fin ? new Date(o.fecha_fin).toLocaleDateString('es-PE',{day:'2-digit',month:'short'}) : null
              return (
                <div key={o.id} style={{ background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:14, overflow:'hidden', position:'relative' }}>
                  <div style={{ position:'absolute', top:12, right:12, background:'#10b981', color:'white', borderRadius:999, padding:'4px 10px', fontSize:12, fontWeight:800 }}>
                    {descuentoLabel(o)}
                  </div>
                  <div style={{ padding:'16px 16px 14px' }}>
                    <div style={{ fontSize:11, color:'#637a93', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
                      {ICONOS[o.producto.categoria]||'📦'} {o.producto.categoria}
                    </div>
                    <p style={{ fontWeight:700, fontSize:15, marginBottom:10, lineHeight:1.3, paddingRight:60 }}>{o.producto.nombre}</p>
                    <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:8 }}>
                      <span style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:22, color:'#34d399' }}>{fmt(pConOferta)}</span>
                      <span style={{ fontFamily:'JetBrains Mono', fontSize:14, color:'#637a93', textDecoration:'line-through' }}>{fmt(o.producto.precio)}</span>
                    </div>
                    <div style={{ background:'rgba(16,185,129,0.08)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#34d399', fontWeight:600, marginBottom:10 }}>
                      💰 El cliente ahorra {fmt(ahorro)} por unidad
                    </div>
                    {o.descripcion && (
                      <p style={{ fontSize:12, color:'#637a93', marginBottom:10, fontStyle:'italic' }}>"{o.descripcion}"</p>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ fontSize:11, color:'#637a93' }}>📦 {o.producto.stock} uds</span>
                        {vence && <span style={{ fontSize:11, color:'#f59e0b' }}>📅 Vence {vence}</span>}
                      </div>
                      <button className="btn btn-danger" style={{ padding:'5px 12px', fontSize:12 }} onClick={() => eliminar(o.id)}>Quitar</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Nueva Oferta */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:480, display:'flex', flexDirection:'column', gap:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>🏷️ Nueva oferta</h2>
              <button onClick={() => { setModal(false); resetForm() }} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>

            {/* Buscador de producto */}
            <div style={{ position:'relative' }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>
                Producto <span style={{ color:'#10b981' }}>*</span>
              </label>
              <div style={{ position:'relative' }}>
                <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93', pointerEvents:'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  className="input"
                  style={{ paddingLeft:40 }}
                  placeholder="Haz clic para ver todos los productos..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setProductoSel(null); setForm(f=>({...f,productoId:null})) }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setTimeout(() => setInputFocused(false), 200)}
                />
                {busqueda && !productoSel && (
                  <button onClick={() => { setBusqueda(''); setProductoSel(null); setForm(f=>({...f,productoId:null})) }}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:16 }}>✕</button>
                )}
              </div>

              {/* Dropdown — aparece al hacer foco O al escribir */}
              {(inputFocused || busqueda) && !productoSel && productosFiltrados.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--bg-700)', border:'1px solid var(--border)', borderRadius:10, marginTop:4, maxHeight:220, overflowY:'auto', zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                  {productosFiltrados.map((p, i) => (
                    <button key={p.id} onMouseDown={() => seleccionarProducto(p)}
                      style={{ width:'100%', background:'none', border:'none', padding:'10px 14px', textAlign:'left', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: i<productosFiltrados.length-1 ? '1px solid rgba(30,51,71,0.5)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:16 }}>{ICONOS[p.categoria]||'📦'}</span>
                        <div>
                          <p style={{ fontSize:14, fontWeight:500, color:'var(--text)' }}>{p.nombre}</p>
                          <p style={{ fontSize:11, color:'#637a93' }}>{p.categoria} · {p.stock} uds</p>
                        </div>
                      </div>
                      <span style={{ fontFamily:'JetBrains Mono', fontSize:13, color:'#10b981', fontWeight:700, flexShrink:0 }}>{fmt(p.precio)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Producto seleccionado */}
              {productoSel && (
                <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'10px 14px', marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontWeight:600, fontSize:14 }}>{productoSel.nombre}</p>
                    <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>
                      Precio actual: <strong style={{ fontFamily:'JetBrains Mono', color:'var(--text)' }}>{fmt(productoSel.precio)}</strong> · Stock: {productoSel.stock} uds
                    </p>
                  </div>
                  <button onClick={() => { setProductoSel(null); setForm(f=>({...f,productoId:null})); setBusqueda('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18 }}>✕</button>
                </div>
              )}
            </div>

            {/* Tipo de oferta */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:8 }}>Tipo de oferta</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { id:'porcentaje',  label:'% Descuento', icon:'%',  desc:'Ej: 20% menos' },
                  { id:'precio_fijo', label:'Precio fijo',  icon:'S/', desc:'Ej: S/ 2.50 hoy' },
                ].map(t => {
                  const isActive = form.tipo === t.id
                  return (
                    <button key={t.id} onClick={() => setForm(f=>({...f,tipo:t.id,valor:''}))}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 8px', borderRadius:10, cursor:'pointer',
                        border: isActive ? '2px solid #10b981' : '2px solid var(--border)',
                        background: isActive ? 'rgba(16,185,129,0.1)' : 'var(--bg-700)', transition:'all 0.15s' }}>
                      <span style={{ fontSize:22, fontWeight:800, fontFamily:'JetBrains Mono', color: isActive ? '#34d399' : '#637a93' }}>{t.icon}</span>
                      <span style={{ fontWeight:700, fontSize:13, color: isActive ? '#34d399' : 'var(--text)' }}>{t.label}</span>
                      <span style={{ fontSize:11, color:'#637a93' }}>{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Valor + Fecha */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>
                  {form.tipo==='porcentaje' ? 'Porcentaje (%)' : 'Precio oferta (S/)'} <span style={{ color:'#10b981' }}>*</span>
                </label>
                <input className="input" type="number" min="0.1"
                  max={form.tipo==='porcentaje' ? 99 : undefined}
                  placeholder={form.tipo==='porcentaje' ? 'Ej: 20' : 'Ej: 2.50'}
                  value={form.valor} onChange={e => setForm(f=>({...f,valor:e.target.value}))}
                  style={{ fontFamily:'JetBrains Mono', fontWeight:700 }} />
                {productoSel && form.valor && parseFloat(form.valor)>0 && (
                  <p style={{ fontSize:12, color:'#34d399', marginTop:6, fontFamily:'JetBrains Mono' }}>
                    → Precio final: {fmt(form.tipo==='porcentaje'
                      ? productoSel.precio*(1-parseFloat(form.valor)/100)
                      : parseFloat(form.valor))}
                  </p>
                )}
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>Válida hasta</label>
                <input className="input" type="date" min={hoy}
                  value={form.fechaFin} onChange={e => setForm(f=>({...f,fechaFin:e.target.value}))} />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>Descripción (opcional)</label>
              <input className="input" placeholder='Ej: "Oferta de fin de semana"'
                value={form.descripcion} onChange={e => setForm(f=>({...f,descripcion:e.target.value}))} />
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => { setModal(false); resetForm() }}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardar}
                disabled={guardando||!form.productoId||!form.valor||parseFloat(form.valor)<=0}>
                {guardando ? 'Guardando...' : '✓ Crear oferta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}