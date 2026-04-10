// src/pages/StockPedidos.jsx - Versión Mejorada para Almacén
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function StockPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState("");

  const esAdmin = user?.rol?.toLowerCase() === "admin";

  const cargar = async () => {
    setCargando(true);
    let query = supabase
      .from("stock_pedidos")
      .select("*")
      .order("created_at", { ascending: false });

    // Filtro por sucursal (solo si no es admin)
    if (!esAdmin && user?.sucursal_id) {
      query = query.eq("sucursal_id", user.sucursal_id);
    }

    if (filtroEstatus) {
      query = query.eq("estatus", filtroEstatus);
    }

    const { data } = await query;
    setPedidos(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, [filtroEstatus]);

  const actualizarEstatus = async (id, nuevoEstatus) => {
    if (!window.confirm(`¿Cambiar el estatus a "${nuevoEstatus}"?`)) return;

    const { error } = await supabase
      .from("stock_pedidos")
      .update({ 
        estatus: nuevoEstatus,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq("id", id);

    if (!error) {
      alert(`✅ Estatus actualizado a ${nuevoEstatus}`);
      cargar();
    } else {
      alert("Error al actualizar el estatus");
    }
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>📋 Gestión de Pedidos de Stock</h2>
        
        <select 
          value={filtroEstatus} 
          onChange={(e) => setFiltroEstatus(e.target.value)}
          style={{ padding: "8px 12px", background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", borderRadius: "8px" }}
        >
          <option value="">Todos los estatus</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Surtido">Surtido</option>
          <option value="No hay stock">No hay stock</option>
          <option value="En compras">En compras</option>
        </select>
      </div>

      {cargando ? (
        <div style={{ textAlign: "center", padding: "100px", color: "#9ca3af" }}>Cargando pedidos de stock...</div>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px", color: "#9ca3af" }}>No hay pedidos de stock en este momento</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                <th style={{ padding: "12px 10px", textAlign: "left" }}>Tipo</th>
                <th style={{ padding: "12px 10px", textAlign: "left" }}>OT Origen</th>
                <th style={{ padding: "12px 10px", textAlign: "left" }}>Número de Parte</th>
                <th style={{ padding: "12px 10px", textAlign: "left" }}>Descripción</th>
                <th style={{ padding: "12px 10px" }}>Cantidad</th>
                <th style={{ padding: "12px 10px", textAlign: "left" }}>Sucursal</th>
                <th style={{ padding: "12px 10px", textAlign: "left" }}>Solicitado por</th>
                <th style={{ padding: "12px 10px" }}>Estatus</th>
                <th style={{ padding: "12px 10px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: "12px 10px" }}>
                    {p.ot_origen === "STOCK" ? (
                      <span style={{ color: "#eab308", fontWeight: "bold" }}>STOCK</span>
                    ) : (
                      <span style={{ color: "#60a5fa" }}>OT</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 10px" }}>{p.ot_origen}</td>
                  <td style={{ padding: "12px 10px" }}>{p.numero_parte}</td>
                  <td>{p.descripcion || "—"}</td>
                  <td style={{ textAlign: "center", fontWeight: "600" }}>{p.cantidad}</td>
                  <td>{p.sucursal_id}</td>
                  <td>{p.solicitado_por}</td>
                  <td>
                    <span style={{
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      fontSize: "13px",
                      background: 
                        p.estatus === "Pendiente" ? "#854d0e" :
                        p.estatus === "Surtido" ? "#166534" :
                        p.estatus === "No hay stock" ? "#991b1b" : "#334155",
                      color: 
                        p.estatus === "Pendiente" ? "#fcd34d" :
                        p.estatus === "Surtido" ? "#86efac" :
                        p.estatus === "No hay stock" ? "#fecaca" : "#e5e7eb"
                    }}>
                      {p.estatus}
                    </span>
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    {p.estatus === "Pendiente" && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button 
                          onClick={() => actualizarEstatus(p.id, "Surtido")}
                          style={{ background: "#16a34a", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px" }}
                        >
                          Surtido
                        </button>
                        <button 
                          onClick={() => actualizarEstatus(p.id, "No hay stock")}
                          style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px" }}
                        >
                          No hay stock
                        </button>
                        <button 
                          onClick={() => actualizarEstatus(p.id, "En compras")}
                          style={{ background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px" }}
                        >
                          En compras
                        </button>
                      </div>
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