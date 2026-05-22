import React from 'react'

const fmt  = (n) => `S/ ${Number(n).toFixed(2)}`
const fmtP = (n) => `S/${Number(n).toFixed(2)}`
const METODO_ICON = { Efectivo:'💵', Yape:'📱', Plin:'📲', Tarjeta:'💳', Fiado:'📋' }
const ANCHOS = { 'a4':48, '80mm':42, '58mm':32 }

function Linea() {
  return <div style={{ borderBottom:'1px dashed #999', margin:'6px 0' }} />
}

function FilaItem({ nombre, cantidad, precio, subtotal, precioOriginal, tieneOferta, ancho, esGranel, unidad }) {
  const ahorroUnidad = tieneOferta && precioOriginal ? precioOriginal - precio : 0
  const ahorroTotal  = ahorroUnidad * cantidad
  const es58 = ancho <= 32

  // Formato cantidad para granel
  const cantidadStr = esGranel
    ? `${parseFloat(cantidad).toFixed(3).replace(/\.?0+$/, '')} ${unidad||'kg'}`
    : `${cantidad}`

  return (
    <div style={{ marginBottom: tieneOferta ? 8 : 4 }}>
      {/* Nombre + subtotal */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 11 : 12 }}>
        <span style={{ flex:1, wordBreak:'break-word', paddingRight:8 }}>{nombre}</span>
        <span style={{ whiteSpace:'nowrap', fontWeight:700 }}>{fmtP(subtotal)}</span>
      </div>
      {/* Cantidad × precio */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
        <span style={{ color:'#555' }}>
          {cantidadStr} x {fmtP(precio)}{esGranel ? `/${unidad||'kg'}` : ''}
          {tieneOferta && precioOriginal && (
            <span style={{ textDecoration:'line-through', color:'#aaa', marginLeft:4 }}>{fmtP(precioOriginal)}</span>
          )}
        </span>
        {tieneOferta && ahorroTotal > 0 && (
          <span style={{ color:'#1a7a4a', fontWeight:600, fontSize: es58 ? 9 : 10 }}>
            🏷️ -{fmtP(ahorroTotal)}
          </span>
        )}
      </div>
      {tieneOferta && (
        <div style={{ fontSize: es58 ? 9 : 10, color:'#1a7a4a', borderLeft:'2px solid #1a7a4a', paddingLeft:4, marginTop:2 }}>
          Precio oferta aplicado
        </div>
      )}
    </div>
  )
}

export default function VistaTicket({ venta, config = {} }) {
  const tipo  = config.ticket_tipo || 'a4'
  const ancho = ANCHOS[tipo] || 42
  const es58  = tipo === '58mm'
  const esA4  = tipo === 'a4'

  const anchoPixels = esA4 ? 380 : tipo==='80mm' ? 300 : 220

  const fecha    = new Date(venta.fecha)
  const fechaStr = fecha.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })

  const tieneDescuento = venta.descuento > 0

  // ── Tipo de comprobante ──────────────────────────────────────────
  const tipoComp  = venta.tipo_comprobante || config.tipo_comprobante || 'ticket'
  const esBoleta  = tipoComp === 'boleta'
  const esNota    = tipoComp === 'nota_venta'
  const regimen   = config.regimen || 'nuevo_rus'
  const mostrarIGV = (esBoleta || esNota) && regimen !== 'nuevo_rus'
  const numComp   = venta.numero_comprobante || `#${String(venta.id).padStart(5,'0')}`
  const labelComp = esBoleta ? 'BOLETA DE VENTA' : esNota ? 'NOTA DE VENTA' : 'TICKET DE VENTA'

  const REGIMEN_LABEL = {
    nuevo_rus: 'Nuevo RUS',
    rer:       'Régimen Especial de Renta',
    mype:      'Régimen MYPE Tributario',
    general:   'Régimen General',
  }

  // ── Ahorro total por ofertas ─────────────────────────────────────
  // Soporta tanto ventas nuevas (precioOriginal) como reimpresas (precio_original de BD)
  const ahorroOfertas = (venta.items||[]).reduce((s, item) => {
    const orig = item.precioOriginal || item.precio_original || null
    const pag  = item.precio || item.precio_unitario
    if (orig && orig > pag) return s + (orig - pag) * item.cantidad
    return s
  }, 0)

  // ── Cliente / comprador ──────────────────────────────────────────
  const nombreCliente  = venta.comprador_nombre
    || venta.cliente
    || venta.nombre_cliente
    || (venta.es_fiado ? 'Cliente con Fiado' : 'Cliente General')

  const dniRucComprador = venta.comprador_dni_ruc || null

  // ── IGV desglosado (RER, MYPE, General) ─────────────────────────
  const igvMonto      = mostrarIGV ? parseFloat((venta.total / 1.18 * 0.18).toFixed(2)) : 0
  const baseImponible = mostrarIGV ? parseFloat((venta.total / 1.18).toFixed(2))        : 0

  return (
    <div id="ticket-imprimible" style={{
      width: anchoPixels,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: es58 ? 11 : 12,
      color: '#111',
      background: 'white',
      padding: esA4 ? '20px 24px' : '12px 10px',
      lineHeight: 1.5,
      margin: '0 auto',
    }}>

      {/* ── Encabezado ── */}
      <div style={{ textAlign:'center', marginBottom:8 }}>
        {(esBoleta || esNota) && (
          <div style={{ fontSize: es58 ? 11 : 13, fontWeight:900, letterSpacing:1, marginBottom:4, textDecoration:'underline' }}>
            {labelComp}
          </div>
        )}
        <div style={{ fontSize: es58 ? 14 : 16, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>
          {config.negocio_nombre || 'MI BODEGA'}
        </div>
        {config.ticket_mostrar_ruc!==false && config.negocio_ruc && (
          <div style={{ fontSize: es58 ? 10 : 11 }}>RUC: {config.negocio_ruc}</div>
        )}
        {config.ticket_mostrar_direccion!==false && config.negocio_direccion && (
          <div style={{ fontSize: es58 ? 10 : 11 }}>{config.negocio_direccion}</div>
        )}
        {config.ticket_mostrar_telefono!==false && config.negocio_telefono && (
          <div style={{ fontSize: es58 ? 10 : 11 }}>Tel: {config.negocio_telefono}</div>
        )}
        {(esBoleta || esNota) && (
          <div style={{ fontSize: es58 ? 9 : 10, color:'#555', marginTop:2 }}>
            {REGIMEN_LABEL[regimen] || ''}
          </div>
        )}
      </div>

      <Linea />

      {/* ── Info de venta ── */}
      <div style={{ fontSize: es58 ? 10 : 11, marginBottom:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>{esBoleta||esNota ? 'N° COMPROBANTE' : 'VENTA N°'}</span>
          <span style={{ fontWeight:700 }}>{numComp}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>FECHA</span><span>{fechaStr}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>HORA</span><span>{horaStr}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>PAGO</span>
          <span>{METODO_ICON[venta.metodo_pago]||''} {venta.metodo_pago}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>CLIENTE</span>
          <span style={{ fontWeight: nombreCliente!=='Cliente General'?700:400 }}>
            {nombreCliente}
          </span>
        </div>
        {dniRucComprador && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>DNI/RUC</span>
            <span style={{ fontWeight:600 }}>{dniRucComprador}</span>
          </div>
        )}
      </div>

      <Linea />

      {/* ── Productos ── */}
      <div style={{ fontSize: es58 ? 10 : 11, marginBottom:2 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, marginBottom:6, borderBottom:'1px solid #ccc', paddingBottom:4 }}>
          <span>DESCRIPCIÓN</span><span>TOTAL</span>
        </div>
        {(venta.items||[]).map((item,i) => {
          const precio         = item.precio || item.precio_unitario
          // FIX: soportar precio_original de BD (reimpresión) y precioOriginal (venta nueva)
          const precioOriginal = item.precioOriginal || item.precio_original || null
          const tieneOferta    = !!(item.oferta || (precioOriginal && precioOriginal > precio))
          const esGranel       = item.tipo_venta === 'granel'
          return (
            <FilaItem key={i}
              nombre={item.nombre_producto || item.nombre}
              cantidad={item.cantidad}
              precio={precio}
              subtotal={item.subtotal}
              precioOriginal={precioOriginal}
              tieneOferta={tieneOferta}
              ancho={ancho}
              esGranel={esGranel}
              unidad={item.unidad}
            />
          )
        })}
      </div>

      <Linea />

      {/* ── Totales ── */}
      <div style={{ fontSize: es58 ? 11 : 12 }}>

        {ahorroOfertas > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11, color:'#1a7a4a' }}>
            <span>🏷️ Ahorro en ofertas</span>
            <span style={{ fontWeight:700 }}>-{fmt(ahorroOfertas)}</span>
          </div>
        )}

        {tieneDescuento && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
              <span>Subtotal</span>
              <span>{fmt(venta.subtotal_bruto || (venta.total + venta.descuento))}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
              <span>Descuento 🏷️</span>
              <span style={{ fontWeight:700 }}>−{fmt(venta.descuento)}</span>
            </div>
          </>
        )}

        {(ahorroOfertas > 0 || tieneDescuento) && (
          <div style={{ borderBottom:'1px solid #ccc', margin:'4px 0' }} />
        )}

        {/* IGV desglosado — solo RER/MYPE/General */}
        {mostrarIGV && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
              <span>Base imponible</span>
              <span>{fmt(baseImponible)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
              <span>IGV (18%)</span>
              <span>{fmt(igvMonto)}</span>
            </div>
            <div style={{ borderBottom:'1px solid #ccc', margin:'4px 0' }} />
          </>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 14 : 16, fontWeight:900, margin:'6px 0' }}>
          <span>TOTAL</span><span>{fmt(venta.total)}</span>
        </div>

        {venta.metodo_pago==='Efectivo' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span>Efectivo</span><span>{fmt(venta.monto_recibido)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700 }}>
              <span>Vuelto</span><span>{fmt(venta.vuelto)}</span>
            </div>
          </>
        )}

        {(ahorroOfertas > 0 || tieneDescuento) && (
          <div style={{ marginTop:6, padding:'5px 8px', border:'1px dashed #1a7a4a', borderRadius:3, textAlign:'center', fontSize: es58 ? 9 : 10, color:'#1a7a4a' }}>
            💰 Ahorro total: {fmt(ahorroOfertas + (venta.descuento||0))}
          </div>
        )}

        {venta.metodo_pago==='Fiado' && (
          <div style={{ marginTop:6, padding:'6px 8px', border:'1px dashed #999', borderRadius:4, fontSize: es58?10:11, textAlign:'center', color:'#555' }}>
            ⚠️ Pendiente de pago — {nombreCliente}
          </div>
        )}
      </div>

      <Linea />

      {/* ── Pie ── */}
      <div style={{ textAlign:'center', fontSize: es58 ? 10 : 11, marginTop:8 }}>
        <div>{config.ticket_mensaje || '¡Gracias por su compra!'}</div>
        <div style={{ marginTop:4, color:'#555' }}>{fechaStr} {horaStr}</div>
      </div>

    </div>
  )
}