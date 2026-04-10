// src/pages/Ventanilla.jsx - Versión Final
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Filtros from "../components/Filtros";
import SolicitarStockModal from "../components/SolicitarStockModal";

export default function Ventanilla() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({});
  const [showStockModal, setShowStockModal] = useState(false);

  const esAdmin = user?.rol?.toLowerCase() === "admin";

  const cargarOrdenes = async () => {
    setCargando(true);

    let query = supabase
      .from("items")
      .select("id, ot, estatus, sucursal_id, numero_parte, descripcion, cantidad")
      .order("ot");

    if (!esAdmin && user?.sucursal_id) {
      query = query.eq("sucursal_id", user.sucursal_id);
    }

    const { data: items } = await query;

    const grupos = {};

    items.forEach(item => {
      if (!grupos[item.ot]) {
        grupos[item.ot] = {
          ot: item.ot,
          sucursal_id: item.sucursal_id,
          total: 0,
          entregadas: 0,
          pendientes: 0,
        };
      }
      grupos[item.ot].total++;
      if (item.estatus === "Entregada") grupos[item.ot].entregadas++;
      else grupos[item.ot].pendientes++;
    });

    let ordenesProcesadas = Object.values(grupos).map(orden => ({
      ...orden,
      estatusGeneral: orden.entregadas === orden.total ? "Completa" 
                       : orden.entregadas > 0 ? "Parcial" 
                       : "Pendiente",
      faltan: orden.pendientes
    }));

    if (filtros.estatus) {
      ordenesProcesadas = ordenesProcesadas.filter(o => o.estatusGeneral === filtros.estatus);
    }
    if (filtros.ot) {
      ordenesProcesadas = ordenesProcesadas.filter(o => 
        o.ot.toLowerCase().includes(filtros.ot.toLowerCase())
      );
    }

    setOrdenes(ordenesProcesadas);
    setCargando(false);
  };

  useEffect(() => {
    cargarOrdenes();
  }, [filtros]);

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2>🪟 Ventanilla de Entregas</h2>
          <p style={{ color: "#9ca3af" }}>Resumen por orden • Entrega de refacciones al cliente</p>
        </div>

        <button 
          onClick={() => setShowStockModal(true)}
          style={{ 
            background: "#d97706", 
            color: "white", 
            border: "none", 
            padding: "12px 28px", 
            borderRadius: "8px", 
            fontSize: "15px", 
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          + Solicitar Stock Independiente
        </button>
      </div>

      <Filtros onFiltrar={setFiltros} />

      {cargando ? (
        <div style={{ textAlign: "center", padding: "100px", color: "#9ca3af" }}>Cargando órdenes...</div>
      ) : ordenes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px", color: "#9ca3af" }}>No se encontraron órdenes</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>OT</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Sucursal</th>
                <th style={{ padding: "12px 8px" }}>Total Piezas</th>
                <th style={{ padding: "12px 8px" }}>Entregadas</th>
                <th style={{ padding: "12px 8px" }}>Pendientes</th>
                <th style={{ padding: "12px 8px" }}>Estatus</th>
                <th style={{ padding: "12px 8px" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <tr key={orden.ot} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: "12px 8px" }}><strong>{orden.ot}</strong></td>
                  <td>{orden.sucursal_id}</td>
                  <td style={{ textAlign: "center" }}>{orden.total}</td>
                  <td style={{ textAlign: "center", color: "#4ade80" }}>{orden.entregadas}</td>
                  <td style={{ textAlign: "center", color: "#facc15" }}>{orden.faltan}</td>
                  <td>
                    <span style={{
                      padding: "8px 16px",
                      borderRadius: "9999px",
                      background: orden.estatusGeneral === "Completa" ? "#166534" :
                                  orden.estatusGeneral === "Parcial" ? "#b45309" : "#854d0e",
                      color: orden.estatusGeneral === "Completa" ? "#86efac" :
                             orden.estatusGeneral === "Parcial" ? "#fcd34d" : "#fef08c"
                    }}>
                      {orden.estatusGeneral}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/ventanilla/${orden.ot}`)}
                      style={{
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      Ver y Entregar →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Solicitar Stock Independiente */}
      {showStockModal && (
        <SolicitarStockModal 
          onClose={() => setShowStockModal(false)} 
          user={user} 
        />
      )}
    </div>
  );
}