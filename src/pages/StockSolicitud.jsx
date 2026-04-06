import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext"; // ✅ AuthContext

export default function StockSolicitud() {
  const { user } = useAuth();
  const [parte, setParte] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [guardando, setGuardando] = useState(false);

  const solicitar = async () => {
    if (!parte || !user) return;

    setGuardando(true);

    const { error } = await supabase.from("stock_pedidos").insert([
      {
        numero_parte: parte,
        cantidad,
        sucursal_id: user.sucursal_id,
        usuario_id: user.id,
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error al generar el pedido");
      return;
    }

    alert("Pedido generado correctamente");
    setParte("");
    setCantidad(1);
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <h2>Solicitud de Stock</h2>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <input
          placeholder="Número de parte"
          value={parte}
          onChange={(e) => setParte(e.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
          style={{ ...inputStyle, width: "80px" }}
        />

        <button
          onClick={solicitar}
          disabled={guardando || !parte}
          style={btnStyle}
        >
          {guardando ? "Guardando..." : "Solicitar"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  color: "#e5e7eb",
  padding: "8px 12px",
  borderRadius: "8px",
};

const btnStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
};
