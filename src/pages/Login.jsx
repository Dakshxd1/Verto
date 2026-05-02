import { useState } from "react";
import supabase from "../lib/supabaseClient";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("❌ Invalid email or password");
    } else {
      alert("✅ Login successful");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-200">
        <h2 className="text-2xl font-semibold mb-6 text-slate-950">Welcome Back</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-6 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-2xl bg-slate-950 text-white px-4 py-3 font-medium transition duration-200 hover:bg-slate-800"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;