// src/components/SolicitarStockModal.jsx
import { useState } from "react";
import { supabase } from "../services/supabase";

export default function SolicitarStockModal({ onClose, user }) {
  const [filas, setFilas] = useState(
    Array.from({ length: 12 }, () => ({ numero_parte: "", cantidad: 1 }))
  );
  const [enviando, setEnviando] = useState(false);

  const actualizarFila = (index, campo, valor) => {
    setFilas(prev => prev.map((f, i) => i === index ? { ...f, [campo]: valor } : f));
  };

  const agregarFila = () => {
    setFilas(prev => [...prev, { numero_parte: "", cantidad: 1 }]);
  };

  const enviarSolicitud = async () => {
    const filasValidas = filas.filter(f => f.numero_parte.trim() !== "");
    if (filasValidas.length === 0) return alert("Debes ingresar al menos un número de parte");

    setEnviando(true);

    const pedidos = filasValidas.map(f => ({
      numero_parte: f.numero_parte.trim().toUpperCase(),
      descripcion: "Solicitud manual desde Ventanilla",
      cantidad: parseInt(f.cantidad) || 1,
      sucursal_id: user.sucursal_id,
      estatus: "Pendiente",
      solicitado_por: user.nombre || user.email,
      ot_origen: "STOCK",
    }));

    const { error } = await supabase.from("stock_pedidos").insert(pedidos);

    setEnviando(false);

    if (!error) {
      alert(`✅ ${pedidos.length} pedido(s) de stock enviados correctamente`);
      onClose();
    } else {
      alert("Error al enviar los pedidos");
      console.error(error);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ 
        background: "#1e2937", padding: "25px", borderRadius: "12px", 
        width: "92%", maxWidth: "920px", maxHeight: "92vh", overflowY: "auto"
      }}>
        <h3>Solicitud Independiente de Stock</h3>
        <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
          Ingresa los números de parte que necesitas comprar (sin estar ligado a una OT)
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f172a" }}>
              <th style={{ padding: "12px" }}>Número de Parte</th>
              <th style={{ padding: "12px" }}>Cantidad</th>
              <th style={{ padding: "12px", width: "80px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, index) => (
              <tr key={index}>
                <td style={{ padding: "8px" }}>
                  <input
                    value={fila.numero_parte}
                    onChange={(e) => actualizarFila(index, "numero_parte", e.target.value)}
                    placeholder="Ej: ABC12345"
                    style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", borderRadius: "6px" }}
                  />
                </td>
                <td style={{ padding: "8px" }}>
                  <input
                    type="number"
                    min="1"
                    value={fila.cantidad}
                    onChange={(e) => actualizarFila(index, "cantidad", e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", borderRadius: "6px" }}
                  />
                </td>
                <td style={{ padding: "8px" }}>
                  <button 
                    onClick={() => setFilas(prev => prev.filter((_, i) => i !== index))}
                    style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "20px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={agregarFila} style={{ padding: "10px 20px", background: "#334155", color: "white", border: "none", borderRadius: "8px" }}>
            + Agregar fila
          </button>
          <button 
            onClick={enviarSolicitud} 
            disabled={enviando}
            style={{ padding: "10px 28px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", fontWeight: "600" }}
          >
            {enviando ? "Enviando..." : "Enviar Solicitudes"}
          </button>
          <button 
            onClick={onClose} 
            style={{ padding: "10px 24px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}