export default function KPI({ title, value, color }) {
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
      <div style={{ color: "#9ca3af", fontSize: "14px" }}>{title}</div>

      <h2 style={{ color, marginTop: "5px" }}>{value}</h2>
    </div>
  );
}