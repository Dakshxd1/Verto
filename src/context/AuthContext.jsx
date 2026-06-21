import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { popupManager } from "../utils/popupManager";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLivePopup, setShowLivePopup] = useState(false);
  // ── NEW: track if the user was kicked out by a new login elsewhere
  const [sessionKicked, setSessionKicked] = useState(false);
  const fetchedEmailRef = useRef(null);
  const sessionCheckIntervalRef = useRef(null); // ── NEW

  const fetchRole = async (email) => {
    if (fetchedEmailRef.current === email) return;
    fetchedEmailRef.current = email;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("email", email)
      .single();
    const userRole = data?.role || null;
    setRole(userRole);
    // ── Save role to localStorage so validateSession can check it ──
    if (userRole) localStorage.setItem("verto_user_role", userRole);
  };

  // ── NEW: validate that this browser's session token is still the latest one
  const validateSession = useCallback(async () => {
    const email = localStorage.getItem("verto_user_email");
    const token = localStorage.getItem("verto_session_token");
    const currentRole = localStorage.getItem("verto_user_role");

    if (!email || !token) return;

    // ── DAY CHANGE CHECK: auto-logout employee/manager/intern at midnight ──
    if (currentRole && currentRole !== "admin") {
      const loginDate = localStorage.getItem("loginDate");
      const today = new Date().toDateString();
      if (loginDate && loginDate !== today) {
        // Date has changed — call DB cleanup then force logout
        await supabase.rpc("auto_logout_day_change");
        clearInterval(sessionCheckIntervalRef.current);
        localStorage.removeItem("verto_session_token");
        localStorage.removeItem("verto_user_email");
        localStorage.removeItem("verto_user_role");
        localStorage.removeItem("loginDate");
        setSessionKicked(false); // not kicked — just expired
        await supabase.auth.signOut();
        fetchedEmailRef.current = null;
        popupManager.clearSession();
        setUser(null);
        setRole(null);
        setShowLivePopup(false);
        window.location.reload();
        return;
      }
    }

    const { data, error } = await supabase.rpc("validate_session", {
      p_email: email,
      p_token: token,
    });

    if (error || !data?.valid) {
      clearInterval(sessionCheckIntervalRef.current);
      localStorage.removeItem("verto_session_token");
      localStorage.removeItem("verto_user_email");
      localStorage.removeItem("verto_user_role");
      localStorage.removeItem("loginDate");
      setSessionKicked(true);
      await supabase.auth.signOut();
      fetchedEmailRef.current = null;
      popupManager.clearSession();
      setUser(null);
      setRole(null);
      setShowLivePopup(false);
    }
  }, []);

  // ── NEW: start polling every 30 seconds once logged in
  const startSessionPolling = useCallback(() => {
    clearInterval(sessionCheckIntervalRef.current);
    sessionCheckIntervalRef.current = setInterval(() => {
      validateSession();
    }, 3000);
  }, [validateSession]);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        await fetchRole(data.user.email);
        await validateSession(); // ── NEW: validate on first load too
        startSessionPolling();   // ── NEW: begin polling
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          clearInterval(sessionCheckIntervalRef.current);
          localStorage.removeItem("verto_user_role"); // ── clean up role
          fetchedEmailRef.current = null;
          popupManager.clearSession();
          setUser(null);
          setRole(null);
          setShowLivePopup(false);
          return;
        }

        if (event === "SIGNED_IN" && session?.user) {
          popupManager.initializeSession(session.user.id);
          if (popupManager.shouldShowPopup()) {
            setShowLivePopup(true);
          }
          startSessionPolling(); // ── NEW: start polling on sign in
        }

        if (session?.user) {
          setUser(session.user);
          fetchRole(session.user.email);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
      clearInterval(sessionCheckIntervalRef.current); // ── NEW: cleanup
    };
  }, [validateSession, startSessionPolling]);

  const handleClosePopup = () => {
    popupManager.markPopupShown();
    setShowLivePopup(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        showLivePopup,
        sessionKicked,       // ── NEW: expose for App.jsx to show kicked screen
        setShowLivePopup: handleClosePopup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);