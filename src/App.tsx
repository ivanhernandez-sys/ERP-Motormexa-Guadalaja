// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Captura from "./pages/Captura";
import Compras from "./pages/Compras";
import PanelAsesor from "./pages/PanelAsesor";
import PanelGerencial from "./pages/PanelGerencial";
import Ventanilla from "./pages/Ventanilla";
import VentanillaDetalle from "./pages/VentanillaDetalle";
import ConsultaOT from "./pages/ConsultaOT";
import StockPedidos from "./pages/StockPedidos";
import Almacen from "./pages/Almacen";
import Chatbot from "./pages/Chatbot";
import MisCotizaciones from "./pages/MisCotizaciones";

function RutasProtegidas() {
  const { user, cargando } = useAuth();

  if (cargando) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0f172a",
        color: "#9ca3af",
        fontSize: "17px"
      }}>
        Cargando sistema...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Captura />} />
        <Route path="/captura" element={<Captura />} />
        <Route path="/mi-panel" element={<PanelAsesor />} />
        <Route path="/mis-cotizaciones" element={<MisCotizaciones />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/gerencial" element={<PanelGerencial />} />
        <Route path="/ventanilla" element={<Ventanilla />} />
        <Route path="/ventanilla/:ot" element={<VentanillaDetalle />} />
        <Route path="/consulta-ot" element={<ConsultaOT />} />
        <Route path="/stock-pedidos" element={<StockPedidos />} />
        <Route path="/almacen" element={<Almacen />} />
        <Route path="/chat" element={<Chatbot />} />

        {/* Redirecciones por rol (opcional pero recomendado) */}
        <Route path="/recepcion-masiva" element={<Almacen />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function LoginGuard() {
  const { user, cargando } = useAuth();
  if (cargando) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={<RutasProtegidas />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}