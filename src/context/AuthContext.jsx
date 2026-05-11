import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch role
  const fetchRole = async (email) => {
  console.log('Fetching role for email:', email);
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("email", email)
    .single();

  console.log('Role fetch result:', { data, error });

  if (data?.role) {
    console.log('Setting role to:', data.role);
    setRole(data.role);
  } else {
    console.log('No role found, setting to null');
    setRole(null);
  }
};

  useEffect(() => {
  const getSession = async () => {
    console.log('Getting session...');
    const { data } = await supabase.auth.getUser();
    console.log('Session data:', data);
    if (data?.user) {
      console.log('User found:', data.user.email);
      setUser(data.user);
      await fetchRole(data.user.email);
    } else {
      console.log('No user found');
      setUser(null);
      setRole(null);
    }
    setLoading(false);
  };

  getSession();

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      console.log('Auth state change:', _event, session?.user?.email);
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