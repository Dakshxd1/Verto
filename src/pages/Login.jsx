import { useState } from "react";
import supabase from "../lib/supabaseClient";

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // LOGIN
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

  // SIGNUP
  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    // insert default role
    await supabase.from("user_roles").insert([
      {
        email,
        role: "employee",
      },
    ]);

    alert("✅ Account created successfully");
    setIsSignup(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-200">
        
        <h2 className="text-2xl font-semibold mb-6 text-slate-950">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          className="w-full mb-4 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          className="w-full mb-6 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* BUTTON */}
        <button
          onClick={isSignup ? handleSignup : handleLogin}
          className="w-full rounded-2xl bg-slate-950 text-white px-4 py-3 font-medium transition duration-200 hover:bg-slate-800"
        >
          {isSignup ? "Create Account" : "Login"}
        </button>

        {/* TOGGLE */}
        <p className="text-center text-sm text-slate-600 mt-5">
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}

          <span
            onClick={() => setIsSignup(!isSignup)}
            className="ml-2 text-slate-950 font-semibold cursor-pointer hover:underline"
          >
            {isSignup ? "Login" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;