import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function BusquedaGlobal() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const navigate = useNavigate();

  const buscar = async (q) => {
    setQuery(q);

    if (q.length < 2) {
      setResultados([]);
      return;
    }

    const { data } = await supabase.rpc("buscar_global", {
      q,
    });

    setResultados(data || []);
  };

  const ir = (item) => {
    navigate(`/ventanilla/${item.ot}`);
    setResultados([]);
    setQuery("");
  };

  return (
    <div style={{ position: "relative", width: "300px" }}>
      <input
        placeholder="Buscar OT, parte o descripción..."
        value={query}
        onChange={(e) => buscar(e.target.value)}
        style={{ width: "100%", padding: "8px" }}
      />

      {resultados.length > 0 && (
        <div
          style={{
            position: "absolute",
            background: "#fff",
            border: "1px solid #ccc",
            width: "100%",
            maxHeight: "300px",
            overflow: "auto",
            zIndex: 10,
          }}
        >
          {resultados.map((r) => (
            <div
              key={r.id}
              onClick={() => ir(r)}
              style={{
                padding: "8px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              <b>{r.ot}</b> | {r.numero_parte}
              <br />
              <small>{r.descripcion}</small>
              <br />
              <span>{r.estatus}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}