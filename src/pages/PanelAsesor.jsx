// src/pages/PanelAsesor.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { COLOR_ESTATUS, diasTranscurridos, formatFecha } from "../utils/catalogos";

function Badge({ estatus }) {
  const c = COLOR_ESTATUS[estatus] || { bg: "#374151", text: "#d1d5db" };
  return (
    <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
      {estatus}
    </span>
  );
}

export default function PanelAsesor() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [notificaciones, setNotificaciones] = useState([]);
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const audioRef = useRef(null);

  const cargar = async () => {
    if (!user) return;
    setCargando(true);
    let q = supabase.from("items").select("*").eq("asesor_id", user.id)
      .order("created_at", { ascending: false });
    if (filtroEstatus) q = q.eq("estatus", filtroEstatus);
    const { data } = await q;
    setItems(data || []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [user, filtroEstatus]);

  // Realtime: notificaciones importantes
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("asesor-notifs")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "items",
        filter: `asesor_id=eq.${user.id}`,
      }, (payload) => {
        const nuevo = payload.new;
        
        let msg = "";
        if (nuevo.estatus === "Recibida") {
          msg = `📦 Llegó a almacén: ${nuevo.descripcion || nuevo.numero_parte} (OT ${nuevo.ot})`;
        } else if (nuevo.estatus === "Comprada") {
          msg = `🛒 Fue comprada: ${nuevo.descripcion || nuevo.numero_parte} (OT ${nuevo.ot})`;
        } else if (nuevo.estatus === "Entregada") {
          msg = `✅ Entregada al cliente: ${nuevo.descripcion || nuevo.numero_parte}`;
        }

        if (msg) {
          setNotificaciones(prev => [msg, ...prev.slice(0, 5)]);
          if (Notification.permission === "granted") {
            new Notification("Motormexa", { body: msg });
          }
        }
        cargar();
      })
      .subscribe();

    if (Notification.permission === "default") Notification.requestPermission();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // Agrupar por OT
  const otMap = {};
  items.forEach(r => {
    if (!otMap[r.ot]) otMap[r.ot] = [];
    otMap[r.ot].push(r);
  });

  const calcEstatus = (estatuses) => {
    if (estatuses.every(e => e === "Entregada")) return "Completa";
    if (estatuses.some(e => e === "Entregada" || e === "Recibida")) return "Parcial";
    if (estatuses.some(e => e === "Comprada")) return "En Compras";
    if (estatuses.some(e => e === "Cotizada")) return "Cotizada";
    return "Pendiente";
  };

  const totalItems = items.length;
  const cotizadas = items.filter(r => r.estatus === "Cotizada").length;
  const compradas = items.filter(r => r.estatus === "Comprada").length;
  const recibidas = items.filter(r => r.estatus === "Recibida").length;
  const entregadas = items.filter(r => r.estatus === "Entregada").length;

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>
          {esVentas ? "📊 Mis Cotizaciones y Pedidos" : "👤 Mi Panel"}
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "13px", margin: "4px 0 0" }}>
          {user?.nombre} · {user?.sucursal_id}
        </p>
      </div>

      {/* Notificaciones en tiempo real */}
      {notificaciones.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {notificaciones.map((n, i) => (
            <div key={i} style={{
              background: "#052e16", border: "1px solid #166534", color: "#bbf7d0",
              padding: "10px 14px", borderRadius: "8px", marginBottom: "6px", fontSize: "13px",
            }}>
              {n}
            </div>
          ))}
          <button onClick={() => setNotificaciones([])} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "11px" }}>
            Limpiar notificaciones
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { label: "Total", val: totalItems, color: "#e5e7eb" },
          { label: esVentas ? "Cotizadas" : "Pendientes", val: esVentas ? cotizadas : items.filter(r => r.estatus === "Pendiente").length, color: "#facc15" },
          { label: "En Compras", val: compradas, color: "#60a5fa" },
          { label: "Recibidas en Almacén", val: recibidas, color: "#4ade80" },
          { label: "Entregadas", val: entregadas, color: "#22c55e" },
        ].map(k => (
          <div key={k.label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px 20px", textAlign: "center", minWidth: "110px" }}>
            <div style={{ color: k.color, fontSize: "22px", fontWeight: 700 }}>{k.val}</div>
            <div style={{ color: "#9ca3af", fontSize: "11px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ marginBottom: "14px" }}>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          style={{ background: "#111827", border: "1px solid #1f2937", color: "#e5e7eb", padding: "8px 12px", borderRadius: "8px" }}>
          <option value="">Todos los estatus</option>
          {["Cotizada", "Pendiente", "Comprada", "Recibida", "Entregada", "Incorrecta"].map(s =>
            <option key={s}>{s}</option>
          )}
        </select>
      </div>

      {/* Lista de OTs */}
      {cargando ? (
        <p style={{ color: "#9ca3af" }}>Cargando...</p>
      ) : Object.keys(otMap).length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No tienes cotizaciones ni pedidos aún.</p>
      ) : (
        Object.entries(otMap).map(([ot, piezas]) => {
          const estatusOT = calcEstatus(piezas.map(p => p.estatus));
          const diasAbierta = diasTranscurridos(piezas[0]?.created_at);

          return (
            <div key={ot} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "12px", marginBottom: "12px", overflow: "hidden" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px",
                background: estatusOT === "Completa" ? "#052e16" : "#0f172a",
                borderBottom: "1px solid #1f2937",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px" }}>OT {ot}</span>
                  <span style={{ color: "#9ca3af", fontSize: "12px" }}>{piezas[0]?.marca} {piezas[0]?.modelo}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: diasAbierta > 7 ? "#f87171" : "#9ca3af", fontSize: "12px" }}>{diasAbierta}d</span>
                  <span style={{
                    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                    background: estatusOT === "Completa" ? "#166534" : estatusOT === "En Compras" ? "#1e40af" : "#7f1d1d",
                    color: "#fff",
                  }}>{estatusOT}</span>
                </div>
              </div>

              <div style={{ padding: "4px 0" }}>
                {piezas.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 16px", borderBottom: "1px solid #0f172a",
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "13px" }}>{p.descripcion || p.numero_parte}</span>
                      {p.numero_parte && <span style={{ color: "#6b7280", fontSize: "11px", marginLeft: "8px" }}>{p.numero_parte}</span>}
                      <span style={{ color: "#4b5563", fontSize: "11px", marginLeft: "8px" }}>[{p.ubicacion}]</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {p.eta && <span style={{ color: "#60a5fa", fontSize: "11px" }}>ETA {formatFecha(p.eta)}</span>}
                      <Badge estatus={p.estatus} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}