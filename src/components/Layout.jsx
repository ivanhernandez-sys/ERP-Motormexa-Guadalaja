import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BusquedaGlobal from "./BusquedaGlobal";

// Menú según rol
const MENU_POR_ROL = {
  asesor: [
    { path: "/captura",        label: "📦 Captura" },
    { path: "/mi-panel",       label: "👤 Mi Panel" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/stock-solicitud",label: "📋 Solicitar Stock" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
  comprador: [
    { path: "/compras",        label: "🛒 Compras" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
  almacen: [
    { path: "/recepcion-masiva",label: "📬 Recepción" },
    { path: "/almacen",        label: "🏭 Almacén" },
    { path: "/stock-pedidos",  label: "📋 Stock Pedidos" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
  ventanilla: [
    { path: "/ventanilla",     label: "🪟 Ventanilla" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
  gerente: [
    { path: "/gerencial",      label: "📊 Panel Gerencial" },
    { path: "/captura",        label: "📦 Captura" },
    { path: "/compras",        label: "🛒 Compras" },
    { path: "/ventanilla",     label: "🪟 Ventanilla" },
    { path: "/recepcion-masiva",label: "📬 Recepción" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
  gerente_sucursal: [
    { path: "/gerencial",      label: "📊 Mi Sucursal" },
    { path: "/captura",        label: "📦 Captura" },
    { path: "/ventanilla",     label: "🪟 Ventanilla" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
  admin: [
    { path: "/gerencial",      label: "📊 Panel Gerencial" },
    { path: "/captura",        label: "📦 Captura" },
    { path: "/compras",        label: "🛒 Compras" },
    { path: "/ventanilla",     label: "🪟 Ventanilla" },
    { path: "/recepcion-masiva",label: "📬 Recepción" },
    { path: "/almacen",        label: "🏭 Almacén" },
    { path: "/stock-pedidos",  label: "📋 Stock" },
    { path: "/consulta-ot",    label: "🔍 Consulta OT" },
    { path: "/chat",           label: "🤖 Asistente" },
  ],
};

// fallback si el rol no está definido
const MENU_DEFAULT = [
  { path: "/captura",     label: "📦 Captura" },
  { path: "/consulta-ot", label: "🔍 Consulta OT" },
  { path: "/chat",        label: "🤖 Asistente" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menu = MENU_POR_ROL[user?.rol] || MENU_DEFAULT;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a" }}>

      {/* SIDEBAR */}
      <aside style={{
        width: "215px", background: "#020617", padding: "16px 10px",
        borderRight: "1px solid #1f2937", display: "flex", flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "20px", padding: "0 6px" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#e5e7eb", letterSpacing: "-0.5px" }}>
            Motormexa
          </div>
          <div style={{ color: "#4b5563", fontSize: "10px", marginTop: "2px" }}>
            Sistema de Refacciones
          </div>
        </div>

        {/* Sucursal badge */}
        {user?.sucursal_id && (
          <div style={{
            background: "#0f172a", border: "1px solid #1f2937", borderRadius: "6px",
            padding: "6px 10px", marginBottom: "14px", textAlign: "center",
          }}>
            <div style={{ color: "#60a5fa", fontSize: "11px", fontWeight: 600 }}>
              {user.sucursal_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
          {menu.map(m => {
            const activo = location.pathname === m.path ||
              (m.path !== "/" && location.pathname.startsWith(m.path));
            return (
              <Link key={m.path} to={m.path} style={{
                padding: "9px 10px", borderRadius: "8px", textDecoration: "none",
                fontSize: "13px", color: activo ? "#fff" : "#9ca3af",
                background: activo ? "#1d4ed8" : "transparent",
                fontWeight: activo ? 600 : 400,
              }}>
                {m.label}
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        {user && (
          <div style={{ borderTop: "1px solid #1f2937", paddingTop: "12px", marginTop: "12px" }}>
            <div style={{ color: "#e5e7eb", fontSize: "12px", fontWeight: 600, marginBottom: "2px" }}>
              {user.nombre || user.email}
            </div>
            <div style={{ color: "#4b5563", fontSize: "10px", marginBottom: "8px" }}>
              {user.rol}
            </div>
            <button onClick={logout} style={{
              width: "100%", background: "transparent", border: "1px solid #1f2937",
              color: "#6b7280", padding: "6px", borderRadius: "6px", cursor: "pointer", fontSize: "11px",
            }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <header style={{
          height: "52px", background: "#020617", borderBottom: "1px solid #1f2937",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", flexShrink: 0,
        }}>
          <span style={{ color: "#4b5563", fontSize: "12px" }}>
            {menu.find(m => location.pathname === m.path || (m.path !== "/" && location.pathname.startsWith(m.path)))?.label || ""}
          </span>
          <BusquedaGlobal />
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
