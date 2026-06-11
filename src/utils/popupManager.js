// Popup Manager - Handles showing popup only once per login session
const POPUP_KEY = "verto_live_popup_shown";
const SESSION_KEY = "verto_session_id";

export const popupManager = {
  // Initialize a new session when user logs in
  initializeSession: (userId) => {
    const sessionId = `${userId}_${Date.now()}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  },

  // Check if we should show the popup
  shouldShowPopup: () => {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    const popupShown = sessionStorage.getItem(POPUP_KEY);

    // Only show if we have a session and popup hasn't been shown in this session
    return sessionId && !popupShown;
  },

  // Mark popup as shown
  markPopupShown: () => {
    sessionStorage.setItem(POPUP_KEY, "true");
  },

  // Clear on logout
  clearSession: () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(POPUP_KEY);
  },
};
