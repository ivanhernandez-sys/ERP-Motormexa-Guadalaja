export default function TablePro({ data }) {
  const color = (estatus) => {
    if (estatus === "Pendiente") return "#facc15";
    if (estatus === "Comprada") return "#3b82f6";
    if (estatus === "Recibida") return "#22c55e";
    if (estatus === "Entregada") return "#16a34a";
    if (estatus === "Incorrecta") return "#ef4444";
    return "#6b7280";
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "#9ca3af", textAlign: "left" }}>
          <th>OT</th>
          <th>Parte</th>
          <th>Descripción</th>
          <th>Estatus</th>
        </tr>
      </thead>

      <tbody>
        {data.map((r) => (
          <tr key={r.id} style={{ borderBottom: "1px solid #1f2937" }}>
            <td>{r.ot}</td>
            <td>{r.numero_parte}</td>
            <td>{r.descripcion}</td>
            <td>
              <span
                style={{
                  background: color(r.estatus),
                  padding: "4px 10px",
                  borderRadius: "8px",
                }}
              >
                {r.estatus}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}