// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";

// Pages
import Login from "./pages/Login";
import Captura from "./pages/Captura";
import Compras from "./pages/Compras";
import PanelAsesor from "./pages/PanelAsesor";        // usado por rol "coordinador"
import PanelAsesorOp from "./pages/PanelAsesorOp";    // nuevo: rol "asesor_op"
import PanelGerencial from "./pages/PanelGerencial";
import Ventanilla from "./pages/Ventanilla";
import VentanillaDetalle from "./pages/VentanillaDetalle";
import ConsultaOT from "./pages/ConsultaOT";
import StockPedidos from "./pages/StockPedidos";
import Almacen from "./pages/Almacen";
import Chatbot from "./pages/Chatbot";
import MisCotizaciones from "./pages/MisCotizaciones";
import Usuarios from "./pages/usuarios";

function RutasProtegidas() {
  const { user, cargando } = useAuth();

  if (cargando) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0f172a", color: "#9ca3af", fontSize: "17px"
      }}>
        Cargando sistema...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🔐 Redirigir asesor_op directo a su panel de consulta
  const rolDefault = user.rol === "asesor_op" ? "/mi-consulta" : "/captura";

  return (
    <Layout>
      <Routes>
        <Route path="/"                   element={<Navigate to={rolDefault} replace />} />

        {/* ── Coordinador (antes "asesor") ─────────────────────────── */}
        <Route path="/captura"            element={<Captura />} />
        <Route path="/mi-panel"           element={<PanelAsesor />} />
        <Route path="/mis-cotizaciones"   element={<MisCotizaciones />} />

        {/* ── Asesor Op. (solo lectura) ────────────────────────────── */}
        <Route path="/mi-consulta"        element={<PanelAsesorOp />} />

        {/* ── Compartidas ──────────────────────────────────────────── */}
        <Route path="/consulta-ot"        element={<ConsultaOT />} />
        <Route path="/chat"               element={<Chatbot />} />

        {/* ── Compras / Almacén ────────────────────────────────────── */}
        <Route path="/compras"            element={<Compras />} />
        <Route path="/almacen"            element={<Almacen />} />
        <Route path="/recepcion-masiva"   element={<Almacen />} />
        <Route path="/stock-pedidos"      element={<StockPedidos />} />

        {/* ── Ventanilla ───────────────────────────────────────────── */}
        <Route path="/ventanilla"         element={<Ventanilla />} />
        <Route path="/ventanilla/:ot"     element={<VentanillaDetalle />} />

        {/* ── Gerencial / Admin ────────────────────────────────────── */}
        <Route path="/gerencial"          element={<PanelGerencial />} />
        <Route path="/usuarios"           element={<Usuarios />} />

        <Route path="*"                   element={<Navigate to={rolDefault} replace />} />
      </Routes>
    </Layout>
  );
}

function LoginGuard() {
  const { user, cargando } = useAuth();
  if (cargando) return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0f172a", color: "#9ca3af"
    }}>
      Cargando sistema...
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"  element={<LoginGuard />} />
          <Route path="/*"      element={<RutasProtegidas />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
