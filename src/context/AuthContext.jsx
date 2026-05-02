import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch role
  const fetchRole = async (email) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("email", email)
      .single();

    if (data) setRole(data.role);
  };

  useEffect(() => {
  const getSession = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUser(data.user);
      await fetchRole(data.user.email);
    }
    setLoading(false);
  };

  getSession();

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user.email);
      } else {
        setUser(null);
        setRole(null);
      }
    }
  );

  // ✅ CLEANUP (IMPORTANT)
  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);