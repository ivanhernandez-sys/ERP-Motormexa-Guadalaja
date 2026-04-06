import { motion } from "framer-motion";

export default function Card({ title, value, color }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "14px",
        border: "1px solid #334155",
        minWidth: "180px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "14px" }}>
        {title}
      </div>

      <h2 style={{ color, marginTop: "5px" }}>
        {value}
      </h2>
    </motion.div>
  );
}