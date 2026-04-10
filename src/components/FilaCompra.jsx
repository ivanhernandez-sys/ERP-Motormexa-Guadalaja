// src/components/FilaCompra.jsx - Corregida con imports

import { useState } from "react";
import { supabase } from "../services/supabase";
import {
  COLOR_ESTATUS,
  calcularETA,
  formatFecha,
  ESTATUSES_ITEM,
} from "../utils/catalogos";

function BadgeEstatus({ estatus }) {
  const c = COLOR_ESTATUS[estatus] || { bg: "#374151", text: "#d1d5db" };
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 700,
    }}>
      {estatus}
    </span>
  );
}

export default function FilaCompra({ item, onActualizar }) {
  const [fechaCompra, setFechaCompra] = useState(item.fecha_compra || "");
  const [horaCompra, setHoraCompra] = useState(item.hora_compra || "");
  const [numPedido, setNumPedido] = useState(item.num_pedido || "");
  const [estatus, setEstatus] = useState(item.estatus);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const nuevaEta = fechaCompra
      ? calcularETA(item.ubicacion, item.fabricante, new Date(fechaCompra))?.toISOString()
      : item.eta;

    const { error } = await supabase
      .from("items")
      .update({
        fecha_compra: fechaCompra || null,
        hora_compra: horaCompra || null,
        num_pedido: numPedido || null,
        estatus,
        eta: nuevaEta,
      })
      .eq("id", item.id);

    setGuardando(false);
    if (!error) onActualizar();
  };

  const diasEspera = item.created_at
    ? Math.floor((Date.now() - new Date(item.created_at)) / 86400000)
    : 0;

  return (
    <tr style={{
      borderBottom: "1px solid #1f2937",
      background: diasEspera > 3 && estatus === "Pendiente" ? "#1a0a00" : "transparent",
    }}>
      <td style={td}><span style={{ fontFamily: "monospace", fontSize: "12px" }}>{item.referencia || "—"}</span></td>
      <td style={td}>
        <div style={{ fontWeight: 600, fontSize: "13px" }}>OT {item.ot}</div>
        <div style={{ color: "#9ca3af", fontSize: "11px" }}>{item.marca} {item.modelo}</div>
      </td>
      <td style={td}><span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 700 }}>{item.ubicacion}</span></td>
      <td style={td} title={item.descripcion}>
        <div style={{ fontSize: "12px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.descripcion || "—"}
        </div>
        {item.numero_parte && <div style={{ color: "#9ca3af", fontSize: "11px" }}>{item.numero_parte}</div>}
      </td>
      <td style={{ ...td, textAlign: "center" }}>{item.cantidad}</td>
      <td style={td}><BadgeEstatus estatus={estatus} /></td>

      <td style={td}>
        <select value={estatus} onChange={e => setEstatus(e.target.value)} style={inputTd}>
          {ESTATUSES_ITEM.map(s => <option key={s}>{s}</option>)}
        </select>
      </td>

      <td style={td}>
        <input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} style={{ ...inputTd, width: "130px" }} />
      </td>
      <td style={td}>
        <input type="time" value={horaCompra} onChange={e => setHoraCompra(e.target.value)} style={{ ...inputTd, width: "90px" }} />
      </td>
      <td style={td}>
        <input value={numPedido} onChange={e => setNumPedido(e.target.value)} placeholder="N° Pedido" style={{ ...inputTd, width: "100px" }} />
      </td>

      <td style={td}>
        <span style={{ fontSize: "11px", color: item.eta ? "#22c55e" : "#9ca3af" }}>
          {item.eta ? formatFecha(item.eta) : "—"}
        </span>
      </td>

      <td style={{ ...td, textAlign: "center", color: diasEspera > 3 ? "#f87171" : "#9ca3af", fontSize: "12px" }}>
        {diasEspera}d
      </td>

      <td style={td}>
        <button onClick={guardar} disabled={guardando} style={btnSave}>
          {guardando ? "..." : "💾"}
        </button>
      </td>
    </tr>
  );
}

// Estilos
const td = { padding: "10px 8px", verticalAlign: "middle" };
const inputTd = {
  background: "#0f172a",
  border: "1px solid #1f2937",
  color: "#e5e7eb",
  padding: "6px 8px",
  borderRadius: "6px",
  fontSize: "12.5px"
};
const btnSave = {
  background: "#1e40af",
  color: "#dbeafe",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer"
};