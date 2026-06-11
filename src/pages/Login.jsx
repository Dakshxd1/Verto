import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import confetti from "canvas-confetti";
import { LogIn, AlertCircle, CheckCircle, Loader, Eye, EyeOff } from "lucide-react";
import BorderGlow from "../components/ui/BorderGlow";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // LOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      localStorage.setItem("loginDate", new Date().toDateString());
      setSuccess("Login successful! Redirecting...");
      triggerLoginConfetti();
      setLoading(false);
    }
  };

  const triggerLoginConfetti = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="flex h-screen items-center justify-center px-4 overflow-hidden relative">
      {/* Enhanced Bluish Translucent Blurry Background */}
      <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-3xl">
        {/* Primary Blue Glow */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[120px] animate-pulse" />
        
        {/* Secondary Indigo Glow */}
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/25 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        
        {/* Tertiary Cyan Glow */}
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        
        {/* Additional Blue Haze Layer */}
        <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-indigo-500/10 backdrop-blur-2xl" />
      </div>

      {/* Main Card with BorderGlow */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <BorderGlow
          edgeSensitivity={35}
          glowColor="210 100 60"
          backgroundColor="#0f1419"
          borderRadius={24}
          glowRadius={50}
          glowIntensity={1.2}
          coneSpread={28}
          colors={["#3b82f6", "#a78bfa", "#ec4899"]}
          fillOpacity={0.3}
        >
          <div className="p-8">
            <div className="relative">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                >
                  <LogIn className="w-7 h-7 text-white" />
                </motion.div>
                
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome Back
                </h1>
                <p className="text-sm text-white/60">
                  Access your financial dashboard
                </p>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-xl p-3"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-200">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Message */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 flex items-center gap-3 bg-green-500/20 border border-green-500/50 rounded-xl p-3"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <p className="text-sm text-green-200">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* EMAIL INPUT */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-4"
              >
                <label className="text-xs font-semibold text-white/70 mb-2 block uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-white placeholder:text-white/40 outline-none transition duration-300 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 hover:bg-white/15"
                />
              </motion.div>

              {/* PASSWORD INPUT */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <label className="text-xs font-semibold text-white/70 mb-2 block uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyPress={handleKeyPress}
                    className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 pr-12 text-white placeholder:text-white/40 outline-none transition duration-300 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 hover:bg-white/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* LOGIN BUTTON */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 font-semibold transition duration-300 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </BorderGlow>

        {/* Decorative Elements */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mt-8 text-center text-white/30 text-xs font-medium"
        >
          ✨ Verto Financial Dashboard
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;