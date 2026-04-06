import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function GraficaEstados({ data }) {
  return (
    <div
      style={{
        background: "#111827",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #1f2937",
      }}
    >
      <h3 style={{ color: "#e5e7eb" }}>Estados</h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}