// src/pages/PanelGerencial.jsx — Actualizado: coordinador (antes "asesor")
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { COLOR_ESTATUS, diasTranscurridos, formatFecha } from "../utils/catalogos";

function KPICard({ title, value, sub, color = "#e5e7eb" }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "18px 20px" }}>
      <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>{title}</div>
      <div style={{ color, fontSize: "26px", fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function BarraProgreso({ label, valor, total, color = "#2563eb" }) {
  const pct = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ color: "#e5e7eb", fontSize: "13px" }}>{label}</span>
        <span style={{ color: "#9ca3af", fontSize: "12px" }}>{valor}/{total} ({pct}%)</span>
      </div>
      <div style={{ background: "#1f2937", height: "8px", borderRadius: "4px" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export default function PanelGerencial() {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [cargando, setCargando] = useState(true);

  const calcular = useCallback(async () => {
    setCargando(true);

    let q = supabase.from("items").select(`
      id, estatus, ot, fabricante, marca, ubicacion,
      sucursal_id, asesor_id, created_at, fecha_compra,
      eta, num_pedido, cantidad,
      asesor:usuarios(nombre), sucursal:sucursales(nombre)
    `);

    if (filtroMes) {
      q = q.gte("created_at", `${filtroMes}-01`).lte("created_at", `${filtroMes}-31`);
    }
    if (filtroSucursal) q = q.eq("sucursal_id", filtroSucursal);

    // 🔐 Filtrar por rol
    // "coordinador" es el nuevo nombre del antiguo "asesor"
    // "asesor_op" también solo ve sus propias órdenes
    if (["coordinador", "ventas", "asesor_op"].includes(user?.rol))
    q = q.eq("asesor_id", user.id);
    if (user?.rol === "ventanilla" || user?.rol === "gerente_sucursal")
      q = q.eq("sucursal_id", user.sucursal_id);

    const { data: rows } = await q;
    if (!rows) { setCargando(false); return; }

    // Conteos base
    const contar = (e) => rows.filter(r => r.estatus === e).length;
    const total = rows.length;
    const entregadas = contar("Entregada");
    const recibidas = contar("Recibida");
    const pendientes = contar("Pendiente");
    const compradas = contar("Comprada");
    const incorrectas = contar("Incorrecta");
    const noCompradas = contar("No comprada");
    const vencidas = contar("Vencida");

    // Tiempo promedio captura → compra
    let sumTiempo = 0, cntTiempo = 0;
    rows.forEach(r => {
      if (r.fecha_compra && r.created_at) {
        const dias = (new Date(r.fecha_compra) - new Date(r.created_at)) / 86400000;
        if (dias >= 0) { sumTiempo += dias; cntTiempo++; }
      }
    });
    const tiempoPromedio = cntTiempo ? (sumTiempo / cntTiempo).toFixed(1) : "—";

    const cumplimiento = recibidas + entregadas > 0
      ? ((entregadas / (recibidas + entregadas)) * 100).toFixed(1) : 0;

    const alertasPendientes = rows
      .filter(r => r.estatus === "Pendiente" && diasTranscurridos(r.created_at) > 3)
      .sort((a, b) => diasTranscurridos(b.created_at) - diasTranscurridos(a.created_at))
      .slice(0, 15);

    // Ranking por sucursal
    const sucursalMap = {};
    rows.forEach(r => {
      const s = r.sucursal?.nombre || r.sucursal_id || "Sin sucursal";
      if (!sucursalMap[s]) sucursalMap[s] = { total: 0, entregadas: 0 };
      sucursalMap[s].total++;
      if (r.estatus === "Entregada") sucursalMap[s].entregadas++;
    });
    const rankingSucursales = Object.entries(sucursalMap)
      .map(([n, v]) => ({ nombre: n, ...v }))
      .sort((a, b) => b.entregadas - a.entregadas);

    // Ranking por coordinador (antes "asesor")
    const asesorMap = {};
    rows.forEach(r => {
      const a = r.asesor?.nombre || r.asesor_id || "Sin coordinador";
      if (!asesorMap[a]) asesorMap[a] = { total: 0, entregadas: 0 };
      asesorMap[a].total++;
      if (r.estatus === "Entregada") asesorMap[a].entregadas++;
    });
    const rankingAsesores = Object.entries(asesorMap)
      .map(([n, v]) => ({ nombre: n, ...v }))
      .sort((a, b) => b.entregadas - a.entregadas)
      .slice(0, 10);

    // Por fabricante
    const fabMap = { Stellantis: 0, Mitsubishi: 0, Peugeot: 0, Otro: 0 };
    rows.forEach(r => {
      if (fabMap[r.fabricante] !== undefined) fabMap[r.fabricante]++;
      else fabMap.Otro++;
    });

    // OTs con estatus
    const otMap = {};
    rows.forEach(r => {
      if (!otMap[r.ot]) otMap[r.ot] = [];
      otMap[r.ot].push(r.estatus);
    });
    let otCompletas = 0, otParciales = 0;
    Object.values(otMap).forEach(estatuses => {
      const todas = estatuses.length;
      const ent = estatuses.filter(e => e === "Entregada").length;
      if (ent === todas) otCompletas++;
      else otParciales++;
    });

    setDatos({
      total, entregadas, recibidas, pendientes, compradas,
      incorrectas, noCompradas, vencidas,
      tiempoPromedio, cumplimiento,
      alertasPendientes, rankingSucursales, rankingAsesores,
      fabMap, otCompletas, otParciales,
    });
    setCargando(false);
  }, [filtroMes, filtroSucursal, user]);

  useEffect(() => { calcular(); }, [calcular]);

  if (cargando) return <div style={{ padding: "40px", color: "#9ca3af", textAlign: "center" }}>Cargando panel...</div>;
  if (!datos) return null;

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>📊 Panel Gerencial</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            style={inputF} title="Filtrar por mes" />
          <button onClick={calcular} style={btnRef}>🔄</button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div style={grid4}>
        <KPICard title="Total ítems" value={datos.total} />
        <KPICard title="Pendientes" value={datos.pendientes} color="#facc15" />
        <KPICard title="Compradas" value={datos.compradas} color="#60a5fa" />
        <KPICard title="Recibidas" value={datos.recibidas} color="#4ade80" />
        <KPICard title="Entregadas" value={datos.entregadas} color="#22c55e" />
        <KPICard title="Incorrectas" value={datos.incorrectas} color="#f87171" />
        <KPICard title="No compradas" value={datos.noCompradas} color="#9ca3af" />
        <KPICard title="Vencidas" value={datos.vencidas} color="#c084fc" />
      </div>

      {/* Métricas */}
      <div style={{ ...grid4, marginTop: "16px" }}>
        <KPICard title="Tiempo prom. captura→compra" value={`${datos.tiempoPromedio} días`} color="#60a5fa" />
        <KPICard title="% Cumplimiento entrega" value={`${datos.cumplimiento}%`} color="#4ade80" />
        <KPICard title="OTs completas" value={datos.otCompletas} color="#22c55e" />
        <KPICard title="OTs parciales/pendientes" value={datos.otParciales} color="#facc15" />
      </div>

      {/* Rankings y alertas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginTop: "20px" }}>

        {/* Ranking por sucursal */}
        <div style={card}>
          <h3 style={cardTitle}>🏢 Por Sucursal</h3>
          {datos.rankingSucursales.map((s, i) => (
            <BarraProgreso key={s.nombre} label={`#${i + 1} ${s.nombre}`} valor={s.entregadas} total={s.total} color="#2563eb" />
          ))}
        </div>

        {/* Ranking por coordinador */}
        <div style={card}>
          <h3 style={cardTitle}>👤 Por Coordinador</h3>
          {datos.rankingAsesores.map((a, i) => (
            <BarraProgreso key={a.nombre} label={`#${i + 1} ${a.nombre}`} valor={a.entregadas} total={a.total} color="#16a34a" />
          ))}
        </div>

        {/* Por fabricante */}
        <div style={card}>
          <h3 style={cardTitle}>🏭 Por Fabricante</h3>
          {Object.entries(datos.fabMap).map(([fab, cnt]) => (
            <BarraProgreso key={fab} label={fab} valor={cnt} total={datos.total} color="#7c3aed" />
          ))}
        </div>

        {/* Alertas de retraso */}
        <div style={card}>
          <h3 style={{ ...cardTitle, color: "#f87171" }}>🚨 Pendientes con retraso (+3 días)</h3>
          {datos.alertasPendientes.length === 0 && (
            <p style={{ color: "#9ca3af", fontSize: "13px" }}>Sin alertas activas ✅</p>
          )}
          {datos.alertasPendientes.map(r => (
            <div key={r.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 10px", background: "#1a0a00", borderRadius: "8px",
              marginBottom: "6px", border: "1px solid #7f1d1d",
            }}>
              <div>
                <span style={{ fontWeight: 700, color: "#fca5a5", fontSize: "13px" }}>OT {r.ot}</span>
                <span style={{ color: "#9ca3af", fontSize: "11px", marginLeft: "8px" }}>{r.descripcion?.substring(0, 30)}</span>
              </div>
              <span style={{ color: "#f87171", fontSize: "12px", fontWeight: 700 }}>
                {diasTranscurridos(r.created_at)}d
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const grid4 = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" };
const card = { background: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" };
const cardTitle = { color: "#e5e7eb", fontSize: "14px", fontWeight: 700, marginTop: 0, marginBottom: "16px" };
const inputF = { background: "#111827", border: "1px solid #1f2937", color: "#e5e7eb", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" };
const btnRef = { background: "#111827", color: "#9ca3af", border: "1px solid #1f2937", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" };
