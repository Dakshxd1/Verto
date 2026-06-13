import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldOff, X, Lock } from "lucide-react";

// ── Intern Mode Banner ──────────────────────────────────────────────────────
// Shows a persistent top banner when the logged-in user has role = "intern".
// Also listens for the "verto:intern:blocked" event and shows a toast.

export default function InternModeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Listen for blocked-action events from useInternGuard
  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message: e.detail?.message || "Action not permitted for interns." },
      ]);
      // Auto-dismiss after 3.5 s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    window.addEventListener("verto:intern:blocked", handler);
    return () => window.removeEventListener("verto:intern:blocked", handler);
  }, []);

  return (
    <>
      {/* ── Sticky read-only banner ── */}
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 text-sm"
              style={{
                background:
                  "linear-gradient(90deg, #92400e 0%, #b45309 50%, #92400e 100%)",
                backgroundSize: "200% 100%",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0">
                  <ShieldOff className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="text-amber-100 font-medium leading-tight">
                  <span className="font-bold text-white">Read-only mode</span>
                  {" — "}
                  You're viewing as an Intern. Saving, editing, and deleting records
                  is disabled.
                </span>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="ml-4 w-6 h-6 flex items-center justify-center rounded-md text-amber-300 hover:text-white hover:bg-amber-700/50 transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Blocked-action toasts ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl pointer-events-auto"
              style={{
                background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)",
                border: "1px solid rgba(251,191,36,0.25)",
                boxShadow:
                  "0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.15)",
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-white/90 whitespace-nowrap">
                {toast.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}