import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  HORARIOS_CORTE, COLOR_ESTATUS, calcularETA, formatFecha,
  generarReferencia, ESTATUSES_ITEM,
} from "../utils/catalogos";

const FABRICANTES = ["Stellantis", "Mitsubishi", "Peugeot"];

function BadgeEstatus({ estatus }) {
  const c = COLOR_ESTATUS[estatus] || { bg: "#374151", text: "#d1d5db" };
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
    }}>{estatus}</span>
  );
}

function FilaCompra({ item, onActualizar }) {
  const [fechaCompra, setFechaCompra] = useState(item.fecha_compra || "");
  const [horaCompra, setHoraCompra] = useState(item.hora_compra || "");
  const [numPedido, setNumPedido] = useState(item.num_pedido || "");
  const [estatus, setEstatus] = useState(item.estatus);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const { error } = await supabase.from("items").update({
      fecha_compra: fechaCompra || null,
      hora_compra: horaCompra || null,
      num_pedido: numPedido || null,
      estatus,
      eta: fechaCompra ? calcularETA(item.ubicacion, item.fabricante, new Date(fechaCompra))?.toISOString() : item.eta,
    }).eq("id", item.id);

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
        <div style={{ fontWeight: 600, fontSize: "13px" }}>{item.ot}</div>
        <div style={{ color: "#9ca3af", fontSize: "11px" }}>{item.marca} {item.modelo}</div>
      </td>
      <td style={td}><span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 700 }}>{item.ubicacion}</span></td>
      <td style={td} title={item.descripcion}>
        <div style={{ fontSize: "12px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.descripcion}
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

export default function Compras() {
  const { user } = useAuth();
  const [data, setData] = useState({ Stellantis: [], Mitsubishi: [], Peugeot: [] });
  const [fabricanteActivo, setFabricanteActivo] = useState("Stellantis");
  const [cargando, setCargando] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    let q = supabase.from("items").select("*").order("created_at", { ascending: true });
    if (filtroEstatus) q = q.eq("estatus", filtroEstatus);

    const { data: rows } = await q;
    if (!rows) { setCargando(false); return; }

    const agrupado = { Stellantis: [], Mitsubishi: [], Peugeot: [] };
    rows.forEach(r => {
      if (agrupado[r.fabricante]) agrupado[r.fabricante].push(r);
    });

    setData(agrupado);
    setCargando(false);
  }, [filtroEstatus]);

  useEffect(() => { cargar(); }, [cargar]);

  // Suscripción realtime
  useEffect(() => {
    const channel = supabase.channel("compras-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, cargar)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cargar]);

  const itemsActivos = data[fabricanteActivo] || [];
  const itemsFiltrados = itemsActivos.filter(r => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return r.ot?.toLowerCase().includes(b) ||
      r.descripcion?.toLowerCase().includes(b) ||
      r.numero_parte?.toLowerCase().includes(b);
  });

  // KPIs por fabricante activo
  const pendientes = itemsActivos.filter(r => r.estatus === "Pendiente").length;
  const compradas = itemsActivos.filter(r => r.estatus === "Comprada").length;
  const recibidas = itemsActivos.filter(r => r.estatus === "Recibida").length;

  // Alerta de corte de horario
  const corte = HORARIOS_CORTE[fabricanteActivo];
  const [hCorte, mCorte] = corte.split(":").map(Number);
  const minutosParaCorte = (hCorte * 60 + mCorte) - (ahora.getHours() * 60 + ahora.getMinutes());
  const alertaCorte = minutosParaCorte > 0 && minutosParaCorte <= 60;
  const pasadoCorte = minutosParaCorte <= 0;

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>🛒 Panel de Compras</h2>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#9ca3af", fontSize: "12px" }}>
            {ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Tabs fabricante */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {FABRICANTES.map(f => (
          <button key={f} onClick={() => setFabricanteActivo(f)} style={{
            padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: "13px",
            background: fabricanteActivo === f ? "#2563eb" : "#111827",
            color: fabricanteActivo === f ? "#fff" : "#9ca3af",
          }}>
            {f}
            <span style={{
              marginLeft: "8px", background: "#1f2937", borderRadius: "12px",
              padding: "1px 7px", fontSize: "11px", color: "#9ca3af",
            }}>
              {(data[f] || []).filter(r => r.estatus === "Pendiente").length}
            </span>
          </button>
        ))}
      </div>

      {/* Alerta de corte */}
      {alertaCorte && (
        <div style={{ background: "#7c2d12", color: "#fed7aa", padding: "10px 16px", borderRadius: "8px", marginBottom: "12px", fontWeight: 600 }}>
          ⚠️ Quedan {minutosParaCorte} minutos para el corte de {fabricanteActivo} ({corte})
        </div>
      )}
      {pasadoCorte && (
        <div style={{ background: "#1a0a00", color: "#f87171", padding: "10px 16px", borderRadius: "8px", marginBottom: "12px" }}>
          🔴 Hora de corte {fabricanteActivo} ({corte}) ya pasó — pedidos para mañana
        </div>
      )}

      {/* KPIs rápidos */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { label: "Pendientes", val: pendientes, color: "#facc15" },
          { label: "Compradas", val: compradas, color: "#60a5fa" },
          { label: "Recibidas", val: recibidas, color: "#4ade80" },
        ].map(k => (
          <div key={k.label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "8px", padding: "10px 20px", textAlign: "center" }}>
            <div style={{ color: k.color, fontSize: "22px", fontWeight: 700 }}>{k.val}</div>
            <div style={{ color: "#9ca3af", fontSize: "11px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <input
          placeholder="Buscar OT, parte, descripción..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputF, flex: 1 }}
        />
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} style={inputF}>
          <option value="">Todos los estatus</option>
          {ESTATUSES_ITEM.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={cargar} style={btnRefresh}>🔄</button>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div style={{ color: "#9ca3af", padding: "40px", textAlign: "center" }}>Cargando...</div>
      ) : itemsFiltrados.length === 0 ? (
        <div style={{ color: "#9ca3af", padding: "40px", textAlign: "center" }}>Sin registros para {fabricanteActivo}</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                {["Referencia", "OT", "Ubic.", "Descripción", "Cant.", "Estatus actual", "Cambiar estatus", "Fecha compra", "Hora", "N° Pedido", "ETA", "Días", ""].map(h => (
                  <th key={h} style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, fontSize: "11px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.map(item => (
                <FilaCompra key={item.id} item={item} onActualizar={cargar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const td = { padding: "8px 8px", verticalAlign: "middle" };
const inputTd = { background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", padding: "5px 7px", borderRadius: "6px", fontSize: "12px" };
const inputF = { background: "#111827", border: "1px solid #1f2937", color: "#e5e7eb", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" };
const btnSave = { background: "#1e3a5f", color: "#93c5fd", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer" };
const btnRefresh = { background: "#111827", color: "#9ca3af", border: "1px solid #1f2937", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" };
