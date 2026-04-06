export default function TablaERP({ data }) {

  const color = (estatus) => {
    if (estatus === "Pendiente") return "#facc15";
    if (estatus === "Comprada") return "#3b82f6";
    if (estatus === "Recibida") return "#22c55e";
    if (estatus === "Entregada") return "#16a34a";
    if (estatus === "Incorrecta") return "#ef4444";
  };

  return (
    <table style={{
      width: "100%",
      background: "#1e293b",
      borderRadius: "10px",
      overflow: "hidden"
    }}>
      <thead style={{ background: "#020617" }}>
        <tr>
          <th>OT</th>
          <th>Parte</th>
          <th>Estatus</th>
        </tr>
      </thead>

      <tbody>
        {data.map((r) => (
          <tr key={r.id}>
            <td>{r.ot}</td>
            <td>{r.numero_parte}</td>
            <td>
              <span style={{
                background: color(r.estatus),
                padding: "5px 10px",
                borderRadius: "6px"
              }}>
                {r.estatus}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}