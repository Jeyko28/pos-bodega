import React, { useState, useEffect } from 'react'

const fmt = (n) => `S/ ${Number(n).toFixed(2)}`

const ICONOS = {
  'Bebidas':'🥤','Snacks':'🍿','Panadería':'🍞','Lácteos':'🥛',
  'Limpieza':'🧹','Higiene':'🧴','Frutas':'🍎','Verduras':'🥦',
  'Otros':'📦','General':'🏷️',
}

function StockBar({ stock, umbral }) {
  const max = Math.max(umbral * 4, stock, 1)
  const pct = Math.min((stock / max) * 100, 100)
  const color = stock === 0 ? '#ef4444' : stock <= Math.floor(umbral / 2) ? '#ef4444' : stock <= umbral ? '#f59e0b' : '#10b981'
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--bg-700)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function Alertas() {
  const [productos, setProductos] = useState([])
  const [config, setConfig] = useState({ umbral_stock_bajo: 5 })
  const [cargando, setCargando] = useState(true)
  const [reponiendo, setReponiendo] = useState(null)
  const [cantidadReponer, setCantidadReponer] = useState('')
  const [umbralEdit, setUmbralEdit] = useState('')
  const [editandoUmbral, setEditandoUmbral] = useState(false)
  const [exitoReponer, setExitoReponer] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [p, c] = await Promise.all([
      window.electronAPI.getProductosBajoStock(),
      window.electronAPI.getConfig(),
    ])
    setProductos(p)
    setConfig(c)
    setCargando(false)
  }

  async function handleReponer(producto) {
    const cant = parseInt(cantidadReponer)
    if (!cant || cant <= 0) return
    await window.electronAPI.reponerStock(producto.id, cant)
    setExitoReponer(producto.id)
    setReponiendo(null)
    setCantidadReponer('')
    setTimeout(() => setExitoReponer(null), 2000)
    cargar()
  }

  async function handleGuardarUmbral() {
    const val = parseInt(umbralEdit)
    if (!val || val < 1) return
    const newConfig = await window.electronAPI.updateConfig({ umbral_stock_bajo: val })
    setConfig(newConfig)
    setEditandoUmbral(false)
    cargar()
  }

  const sinStock  = productos.filter(p => p.stock === 0)
  const criticos  = productos.filter(p => p.stock > 0 && p.stock <= Math.floor(config.umbral_stock_bajo / 2))
  const bajoStock = productos.filter(p => p.stock > Math.floor(config.umbral_stock_bajo / 2) && p.stock <= config.umbral_stock_bajo)

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ─── Header fijo ─── */}
      <div style={{ padding: '24px 24px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Alertas de Stock</h1>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {cargando ? 'Cargando...' : productos.length === 0
              ? '✅ Todos los productos tienen stock suficiente'
              : `${productos.length} producto${productos.length > 1 ? 's' : ''} requieren atención`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Umbral configurable */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#637a93' }}>Umbral de alerta:</span>
            {editandoUmbral ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number" min="1" max="50"
                  value={umbralEdit}
                  onChange={e => setUmbralEdit(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGuardarUmbral(); if (e.key === 'Escape') setEditandoUmbral(false) }}
                  autoFocus
                  style={{ width: 60, background: 'var(--bg-700)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, outline: 'none' }}
                />
                <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={handleGuardarUmbral}>✓</button>
                <button className="btn btn-ghost"   style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setEditandoUmbral(false)}>✕</button>
              </div>
            ) : (
              <button onClick={() => { setUmbralEdit(String(config.umbral_stock_bajo)); setEditandoUmbral(true) }}
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: '#34d399' }}>{config.umbral_stock_bajo}</span>
                <span style={{ fontSize: 11, color: '#637a93' }}>uds ✏️</span>
              </button>
            )}
          </div>
          <button className="btn btn-ghost" onClick={cargar} style={{ fontSize: 13 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* ─── Área scrolleable ─── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 24px 24px',
      }}>
        {cargando ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#637a93' }}>Cargando...</div>
        ) : productos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#637a93', height: 300 }}>
            <div style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✅</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>¡Todo en orden!</p>
              <p style={{ fontSize: 14, marginTop: 6 }}>Todos los productos tienen más de {config.umbral_stock_bajo} unidades en stock.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {sinStock.length > 0 && (
              <Seccion titulo="Sin Stock" icono="🚫" count={sinStock.length}
                color="#ef4444" bgColor="rgba(239,68,68,0.08)" borderColor="rgba(239,68,68,0.3)"
                descripcion="Estos productos no pueden venderse">
                {sinStock.map(p => (
                  <FilaProducto key={p.id} p={p} umbral={config.umbral_stock_bajo}
                    reponiendo={reponiendo} exitoReponer={exitoReponer}
                    cantidadReponer={cantidadReponer} setCantidadReponer={setCantidadReponer}
                    setReponiendo={setReponiendo} onReponer={handleReponer} />
                ))}
              </Seccion>
            )}

            {criticos.length > 0 && (
              <Seccion titulo="Stock Crítico" icono="⚠️" count={criticos.length}
                color="#ef4444" bgColor="rgba(239,68,68,0.05)" borderColor="rgba(239,68,68,0.2)"
                descripcion={`Quedan muy pocas unidades (menos de ${Math.floor(config.umbral_stock_bajo / 2) + 1})`}>
                {criticos.map(p => (
                  <FilaProducto key={p.id} p={p} umbral={config.umbral_stock_bajo}
                    reponiendo={reponiendo} exitoReponer={exitoReponer}
                    cantidadReponer={cantidadReponer} setCantidadReponer={setCantidadReponer}
                    setReponiendo={setReponiendo} onReponer={handleReponer} />
                ))}
              </Seccion>
            )}

            {bajoStock.length > 0 && (
              <Seccion titulo="Stock Bajo" icono="📉" count={bajoStock.length}
                color="#f59e0b" bgColor="rgba(245,158,11,0.05)" borderColor="rgba(245,158,11,0.2)"
                descripcion={`Por debajo del umbral de ${config.umbral_stock_bajo} unidades`}>
                {bajoStock.map(p => (
                  <FilaProducto key={p.id} p={p} umbral={config.umbral_stock_bajo}
                    reponiendo={reponiendo} exitoReponer={exitoReponer}
                    cantidadReponer={cantidadReponer} setCantidadReponer={setCantidadReponer}
                    setReponiendo={setReponiendo} onReponer={handleReponer} />
                ))}
              </Seccion>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

function Seccion({ titulo, icono, count, color, bgColor, borderColor, descripcion, children }) {
  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icono}</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color }}>{titulo}</span>
            <p style={{ fontSize: 12, color: '#637a93', marginTop: 1 }}>{descripcion}</p>
          </div>
        </div>
        <span style={{ background: `${color}22`, color, borderRadius: 999, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>
          {count} producto{count > 1 ? 's' : ''}
        </span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function FilaProducto({ p, umbral, reponiendo, exitoReponer, cantidadReponer, setCantidadReponer, setReponiendo, onReponer }) {
  const isReponiendo = reponiendo === p.id
  const isExito = exitoReponer === p.id
  const stockColor = p.stock === 0 ? '#ef4444' : p.stock <= Math.floor(umbral / 2) ? '#ef4444' : '#f59e0b'

  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(30,51,71,0.4)', display: 'flex', alignItems: 'center', gap: 16 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      <div style={{ width: 42, height: 42, background: 'var(--bg-card)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {ICONOS[p.categoria] || '📦'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.nombre}</div>
        <div style={{ fontSize: 12, color: '#637a93', marginBottom: 6 }}>{p.categoria} · {fmt(p.precio)}</div>
        <StockBar stock={p.stock} umbral={umbral} />
      </div>

      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 22, color: stockColor }}>{p.stock}</div>
        <div style={{ fontSize: 11, color: '#637a93' }}>unidades</div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {isExito ? (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '8px 16px', color: '#34d399', fontWeight: 600, fontSize: 13 }}>
            ✓ Repuesto
          </div>
        ) : isReponiendo ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 11, color: '#637a93', display: 'block', marginBottom: 4 }}>CANTIDAD</label>
              <input type="number" min="1" autoFocus value={cantidadReponer}
                onChange={e => setCantidadReponer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onReponer(p); if (e.key === 'Escape') setReponiendo(null) }}
                style={{ width: 80, background: 'var(--bg-700)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
              <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => onReponer(p)}>✓ Agregar</button>
              <button className="btn btn-ghost"   style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => { setReponiendo(null); setCantidadReponer('') }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ fontSize: 13, gap: 6 }} onClick={() => { setReponiendo(p.id); setCantidadReponer('') }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <line x1="12" y1="22" x2="12" y2="12"/><line x1="12" y1="12" x2="3.27" y2="6.96"/>
            </svg>
            Reponer stock
          </button>
        )}
      </div>
    </div>
  )
}