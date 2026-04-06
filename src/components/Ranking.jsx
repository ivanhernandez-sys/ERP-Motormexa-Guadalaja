import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Ranking() {
  const [data, setData] = useState([]);

  const cargar = async () => {
    const { data } = await supabase.rpc("ranking_asesores");
    setData(data || []); // ✅ Bug corregido: antes decía `setData || ([])` que nunca ejecutaba
  };

  useEffect(() => {
    cargar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        background: "#111827",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #1f2937",
        color: "#e5e7eb",
      }}
    >
      <h3>🏆 Ranking Asesores</h3>

      {data.length === 0 && (
        <p style={{ color: "#9ca3af" }}>Sin datos disponibles</p>
      )}

      {data.map((r, i) => {
        const porcentaje = r.total
          ? ((r.entregadas / r.total) * 100).toFixed(0)
          : 0;

        return (
          <div key={r.asesor_id || i} style={{ marginTop: "10px" }}>
            <div>
              #{i + 1} — {r.asesor_id}
            </div>

            <div
              style={{
                height: "6px",
                background: "#1f2937",
                borderRadius: "4px",
                marginTop: "4px",
              }}
            >
              <div
                style={{
                  width: `${porcentaje}%`,
                  background: "#22c55e",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.4s",
                }}
              />
            </div>

            <small style={{ color: "#9ca3af" }}>
              {r.entregadas}/{r.total} ({porcentaje}%)
            </small>
          </div>
        );
      })}
    </div>
  );
}
