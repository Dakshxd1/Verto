import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const LivePopup = ({ isOpen, onClose }) => {
  const [displayText, setDisplayText] = useState("");
  const fullText = "We're Live!";

  // Typewriter effect
  useEffect(() => {
    if (!isOpen) {
      setDisplayText("");
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.substring(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Popup Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10"
          >
            <div className="relative w-full max-w-md bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
              {/* Animated Background */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              </div>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-slate-900 transition-colors shadow-md"
              >
                <X className="w-5 h-5" />
              </motion.button>

              {/* Content */}
              <div className="relative p-8 text-center">
                {/* Floating Icons */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex justify-center gap-2 mb-6"
                >
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <CheckCircle className="w-8 h-8 text-green-500 animate-bounce" />
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                </motion.div>

                {/* Main Heading with Typewriter */}
                <motion.h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-3">
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block ml-1"
                  >
                    |
                  </motion.span>
                </motion.h2>

                {/* Subheading */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-lg font-semibold text-slate-700 mb-4"
                >
                  Welcome to Verto! 🎉
                </motion.p>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                  className="text-sm text-slate-600 leading-relaxed mb-8"
                >
                  Your financial management dashboard is now ready. Start tracking invoices, payments, and expenses with ease.
                </motion.p>

                {/* Feature List */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="grid grid-cols-3 gap-3 mb-8"
                >
                  {[
                    { icon: "📊", label: "Dashboard" },
                    { icon: "💰", label: "Payments" },
                    { icon: "📄", label: "Invoices" },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      className="rounded-xl bg-gradient-to-br from-white/50 to-slate-100/50 p-3 backdrop-blur-sm"
                    >
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <p className="text-xs font-medium text-slate-700">
                        {item.label}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* CTA Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
                >
                  Let's Get Started! 🚀
                </motion.button>

                {/* Celebration Animation */}
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-20 -right-20 w-40 h-40 border-2 border-blue-200/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: [360, 0] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-20 -left-20 w-40 h-40 border-2 border-indigo-200/30 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LivePopup;
