import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarUsuario = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setCargando(false);
      return;
    }

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_id", authUser.id)
      .single();

    setUser(data || null);
    setCargando(false);
  };

  useEffect(() => {
    cargarUsuario();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      cargarUsuario();
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, cargando, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
