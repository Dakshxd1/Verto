import { useAuth } from "../context/AuthContext";

/**
 * useInternGuard
 *
 * Returns helpers for checking if the current user is an intern.
 *
 * Usage in a save handler:
 *   const { isIntern, blockIfIntern } = useInternGuard();
 *
 *   const handleSave = () => {
 *     if (blockIfIntern()) return;   // shows toast + returns true if intern
 *     // ... proceed with save
 *   };
 */
export function useInternGuard() {
  const { role } = useAuth();

  const isIntern = role === "intern";

  /**
   * blockIfIntern — call at the top of any save / write handler.
   * Returns true (and fires a toast) if the user is an intern, false otherwise.
   */
  const blockIfIntern = (message) => {
    if (!isIntern) return false;

    // Fire a custom DOM event so any component can listen for it
    window.dispatchEvent(
      new CustomEvent("verto:intern:blocked", {
        detail: {
          message:
            message ||
            "Interns cannot save or modify records. Contact your manager.",
        },
      })
    );
    return true;
  };

  return { isIntern, blockIfIntern };
}