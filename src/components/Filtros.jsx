import { useState } from "react";

export default function Filtros({ onFiltrar }) {
  const [estatus, setEstatus] = useState("");
  const [ot, setOt] = useState("");
  const [parte, setParte] = useState("");
  const [asesor, setAsesor] = useState("");

  const aplicar = () => {
    onFiltrar({
      estatus,
      ot,
      numero_parte: parte,
      asesor_id: asesor,
    });
  };

  const limpiar = () => {
    setEstatus("");
    setOt("");
    setParte("");
    setAsesor("");

    onFiltrar({});
  };

  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
      <select onChange={(e) => setEstatus(e.target.value)} value={estatus}>
        <option value="">Estatus</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Comprada">Comprada</option>
        <option value="Recibida">Recibida</option>
        <option value="Entregada">Entregada</option>
        <option value="Incorrecta">Incorrecta</option>
      </select>

      <input
        placeholder="OT"
        value={ot}
        onChange={(e) => setOt(e.target.value)}
      />

      <input
        placeholder="Número de parte"
        value={parte}
        onChange={(e) => setParte(e.target.value)}
      />

      <input
        placeholder="Asesor ID"
        value={asesor}
        onChange={(e) => setAsesor(e.target.value)}
      />

      <button onClick={aplicar}>Filtrar</button>
      <button onClick={limpiar}>Limpiar</button>
    </div>
  );
}