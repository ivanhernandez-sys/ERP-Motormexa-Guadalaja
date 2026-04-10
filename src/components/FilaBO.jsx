import { useState } from "react";
import { supabase } from "../services/supabase";

const estatusBOOptions = [
  'Buscando', 
  'Esperando confirmación', 
  'Confirmada', 
  'En proceso de pago', 
  'Pagada', 
  'En tránsito', 
  'Llegada', 
  'Recibida', 
  'No disponible'
];

export default function FilaBO({ item, onActualizar, onMandarGeneral }) {
  const [editing, setEditing] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    estatus_bo: item.estatus_bo || 'Buscando',
    proveedor_bo: item.proveedor_bo || '',
    guia_envio_bo: item.guia_envio_bo || '',
    costo_envio_bo: item.costo_envio_bo || '',
    origen_envio_bo: item.origen_envio_bo || '',
    fecha_tramite_pago_bo: item.fecha_tramite_pago_bo || '',
    prioridad_bo: item.prioridad_bo || 0,
    nota_bo: item.nota_bo || ''
  });

  const handleSave = async () => {
    setGuardando(true);

    const { error } = await supabase
      .from("items")
      .update({
        estatus_bo: form.estatus_bo,
        proveedor_bo: form.proveedor_bo,
        guia_envio_bo: form.guia_envio_bo,
        costo_envio_bo: form.costo_envio_bo ? parseFloat(form.costo_envio_bo) : null,
        origen_envio_bo: form.origen_envio_bo,
        fecha_tramite_pago_bo: form.fecha_tramite_pago_bo || null,
        prioridad_bo: parseInt(form.prioridad_bo) || 0,
        nota_bo: form.nota_bo,
        es_bo: true
      })
      .eq("id", item.id);

    setGuardando(false);
    if (!error) {
      setEditing(false);
      onActualizar();
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  // Resaltar prioridad alta (1-2 piezas)
  const esPrioritaria = item.cantidad <= 2;
  const prioridadColor = item.prioridad_bo >= 8 ? "#7f1d1d" : 
                         item.prioridad_bo >= 5 ? "#b45309" : 
                         esPrioritaria ? "#854d0e" : "#1f2937";

  return (
    <tr style={{
      borderBottom: "1px solid #1f2937",
      background: prioridadColor,
      fontWeight: esPrioritaria ? "600" : "normal"
    }}>
      <td style={{ padding: "10px 8px" }}>
        <div style={{ fontWeight: 600 }}>{item.ot}</div>
      </td>
      <td style={{ padding: "10px 8px" }}>{item.numero_parte}</td>
      <td style={{ padding: "10px 8px", maxWidth: "220px" }}>{item.descripcion}</td>
      <td style={{ padding: "10px 8px", textAlign: "center" }}>{item.cantidad}</td>

      {/* Estatus BO */}
      <td style={{ padding: "10px 8px" }}>
        {editing ? (
          <select 
            value={form.estatus_bo} 
            onChange={e => setForm({...form, estatus_bo: e.target.value})}
            style={{ width: "100%", padding: "4px", borderRadius: "4px" }}
          >
            {estatusBOOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span style={{ fontWeight: 700, color: "#f59e0b" }}>{item.estatus_bo}</span>
        )}
      </td>

      {/* Proveedor */}
      <td style={{ padding: "10px 8px" }}>
        {editing ? (
          <input 
            type="text" 
            value={form.proveedor_bo} 
            onChange={e => setForm({...form, proveedor_bo: e.target.value})} 
            style={{ width: "100%", padding: "4px" }}
          />
        ) : item.proveedor_bo || '—'}
      </td>

      {/* Guía */}
      <td style={{ padding: "10px 8px" }}>
        {editing ? (
          <input 
            type="text" 
            value={form.guia_envio_bo} 
            onChange={e => setForm({...form, guia_envio_bo: e.target.value})} 
            style={{ width: "100%", padding: "4px" }}
          />
        ) : item.guia_envio_bo || '—'}
      </td>

      {/* Costo Envío */}
      <td style={{ padding: "10px 8px", textAlign: "right" }}>
        {editing ? (
          <input 
            type="number" 
            step="0.01" 
            value={form.costo_envio_bo} 
            onChange={e => setForm({...form, costo_envio_bo: e.target.value})} 
            style={{ width: "80px", padding: "4px" }}
          />
        ) : item.costo_envio_bo ? `$${item.costo_envio_bo}` : '—'}
      </td>

      {/* Fecha Trámite Pago */}
      <td style={{ padding: "10px 8px" }}>
        {editing ? (
          <input 
            type="date" 
            value={form.fecha_tramite_pago_bo || ''} 
            onChange={e => setForm({...form, fecha_tramite_pago_bo: e.target.value})} 
            style={{ padding: "4px" }}
          />
        ) : item.fecha_tramite_pago_bo || '—'}
      </td>

      {/* Prioridad */}
      <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: "bold" }}>
        {editing ? (
          <input 
            type="number" 
            min="0" 
            max="10" 
            value={form.prioridad_bo} 
            onChange={e => setForm({...form, prioridad_bo: e.target.value})} 
            style={{ width: "60px", textAlign: "center" }}
          />
        ) : (
          <span style={{ color: item.prioridad_bo >= 8 ? "#ef4444" : "#fbbf24" }}>
            {item.prioridad_bo}
          </span>
        )}
      </td>

      {/* Acciones */}
      <td style={{ padding: "10px 8px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button 
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={guardando}
            style={{
              padding: "6px 12px",
              background: editing ? "#16a34a" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            {editing ? (guardando ? "..." : "Guardar") : "Editar"}
          </button>

          <button 
            onClick={() => onMandarGeneral(item.id)}
            style={{
              padding: "6px 12px",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            → General
          </button>
        </div>
      </td>
    </tr>
  );
}