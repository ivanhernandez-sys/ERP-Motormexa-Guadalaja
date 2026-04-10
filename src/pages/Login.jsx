import { useState } from "react";
import { supabase } from "../services/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // ====================== LOGIN ======================
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMensaje("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMensaje("Credenciales incorrectas. Verifica tu correo y contraseña.");
    } else {
      // Recargar para que AuthContext detecte el usuario
      window.location.reload();
    }
    setLoading(false);
  };

  // ====================== RESET PASSWORD ======================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setMensaje("Ingresa tu correo electrónico");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setMensaje("No se pudo enviar el correo. Inténtalo nuevamente.");
    } else {
      setMensaje("✅ Se ha enviado un enlace de recuperación a tu correo electrónico.");
      setTimeout(() => {
        setResetMode(false);
        setResetEmail("");
        setMensaje("");
      }, 4500);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        background: "#1e2937",
        padding: "48px 40px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "420px",
        border: "1px solid #334155",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
      }}>
        {/* Logo / Título */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#e5e7eb", marginBottom: "4px" }}>
            Motormexa
          </div>
          <div style={{ color: "#64748b", fontSize: "15px" }}>
            Sistema de Refacciones
          </div>
        </div>

        {!resetMode ? (
          /* ====================== FORMULARIO LOGIN ====================== */
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />

            {mensaje && (
              <p style={{
                color: mensaje.includes("✅") ? "#4ade80" : "#f87171",
                textAlign: "center",
                margin: "12px 0",
                fontSize: "14px"
              }}>
                {mensaje}
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={btnPrimary}
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </button>

            <p 
              onClick={() => setResetMode(true)}
              style={{
                textAlign: "center",
                color: "#60a5fa",
                cursor: "pointer",
                marginTop: "24px",
                fontSize: "14.5px"
              }}
            >
              ¿Olvidaste tu contraseña?
            </p>
          </form>
        ) : (
          /* ====================== FORMULARIO RESET ====================== */
          <form onSubmit={handleResetPassword}>
            <h3 style={{ color: "#e5e7eb", textAlign: "center", marginBottom: "24px" }}>
              Recuperar Contraseña
            </h3>

            <input
              type="email"
              placeholder="Ingresa tu correo electrónico"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              style={inputStyle}
              required
            />

            {mensaje && (
              <p style={{
                color: mensaje.includes("✅") ? "#4ade80" : "#f87171",
                textAlign: "center",
                margin: "16px 0",
                fontSize: "14px"
              }}>
                {mensaje}
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={btnPrimary}
            >
              {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
            </button>

            <p 
              onClick={() => {
                setResetMode(false);
                setMensaje("");
                setResetEmail("");
              }}
              style={{
                textAlign: "center",
                color: "#94a3b8",
                cursor: "pointer",
                marginTop: "20px",
                fontSize: "14px"
              }}
            >
              ← Volver al inicio de sesión
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ==================== ESTILOS ==================== */
const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  marginBottom: "16px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#e5e7eb",
  fontSize: "15px",
  outline: "none",
};

const btnPrimary = {
  width: "100%",
  padding: "14px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "8px",
  transition: "background-color 0.2s",
};

btnPrimary[':hover'] = {
  backgroundColor: "#1d4ed8"
};