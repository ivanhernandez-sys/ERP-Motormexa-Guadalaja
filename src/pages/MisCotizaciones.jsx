// src/pages/MisCotizaciones.jsx
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function MisCotizaciones() {
  const { user } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas"); // todas | pendientes | liberadas

  const cargar = async () => {
    if (!user?.id) return;

    setCargando(true);
    let query = supabase
      .from("items")
      .select("*")
      .eq("es_cotizacion", true)
      .eq("asesor_id", user.id)
      .order("created_at", { ascending: false });

    const { data } = await query;
    setCotizaciones(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, [user]);

  const liberarACOmpras = async (id) => {
    if (!confirm("¿Liberar esta pieza a Compras?")) return;

    const { error } = await supabase
      .from("items")
      .update({ 
        estatus: "Pendiente", 
        es_cotizacion: false,
        fecha_liberacion: new Date().toISOString()
      })
      .eq("id", id);

    if (!error) {
      alert("✅ Pieza liberada correctamente a Compras");
      cargar();
    } else {
      alert("Error al liberar la pieza");
    }
  };

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    if (filtro === "todas") return true;
    if (filtro === "pendientes") return c.estatus !== "Pendiente";
    if (filtro === "liberadas") return c.estatus === "Pendiente";
    return true;
  });

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>📋 Mis Cotizaciones</h2>
        
        <select 
          value={filtro} 
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#0f172a",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            borderRadius: "8px"
          }}
        >
          <option value="todas">Todas</option>
          <option value="pendientes">Pendientes de liberar</option>
          <option value="liberadas">Ya liberadas a compras</option>
        </select>
      </div>

      {cargando ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>Cargando cotizaciones...</p>
      ) : cotizacionesFiltradas.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>No tienes cotizaciones registradas</p>
      ) : (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Folio Cotización</th>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Marca / Modelo</th>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Número de Parte</th>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Descripción</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Cantidad</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Estatus</th>
                <th style={{ padding: "14px 12px" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cotizacionesFiltradas.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: "14px 12px" }}>{c.folio_cotizacion || "—"}</td>
                  <td style={{ padding: "14px 12px" }}>
                    {c.marca} {c.modelo}
                  </td>
                  <td style={{ padding: "14px 12px" }}>{c.numero_parte}</td>
                  <td style={{ padding: "14px 12px" }}>{c.descripcion}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600 }}>
                    {c.cantidad}
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "center" }}>
                    <span style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      background: c.estatus === "Pendiente" ? "#854d0e" : "#166534",
                      color: c.estatus === "Pendiente" ? "#fcd34d" : "#86efac"
                    }}>
                      {c.estatus || "Cotización"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 12px" }}>
                    {c.estatus !== "Pendiente" && (
                      <button
                        onClick={() => liberarACOmpras(c.id)}
                        style={{
                          background: "#2563eb",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                      >
                        Liberar a Compras
                      </button>
                    )}
                    {c.estatus === "Pendiente" && (
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>Ya liberada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}