import { createContext, useContext, useEffect, useState, useRef } from "react";
import supabase from "../lib/supabaseClient";
import { popupManager } from "../utils/popupManager";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLivePopup, setShowLivePopup] = useState(false);
  const fetchedEmailRef = useRef(null); // ← tracks last fetched email

  const fetchRole = async (email) => {
    // ← skip if already fetched for this email
    if (fetchedEmailRef.current === email) return;
    fetchedEmailRef.current = email;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("email", email)
      .single();

    setRole(data?.role || null);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        await fetchRole(data.user.email);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // ← only handle actual sign in/out, ignore TOKEN_REFRESHED etc.
        if (event === "SIGNED_OUT") {
          fetchedEmailRef.current = null;
          popupManager.clearSession();
          setUser(null);
          setRole(null);
          setShowLivePopup(false);
          return;
        }

        if (event === "SIGNED_IN" && session?.user) {
          // Initialize new session and show popup only if not shown yet
          popupManager.initializeSession(session.user.id);
          if (popupManager.shouldShowPopup()) {
            setShowLivePopup(true);
          }
        }

        if (session?.user) {
          setUser(session.user);
          fetchRole(session.user.email); // skips if same email already fetched
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleClosePopup = () => {
    popupManager.markPopupShown();
    setShowLivePopup(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, showLivePopup, setShowLivePopup: handleClosePopup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);