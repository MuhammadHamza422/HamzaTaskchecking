"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import apiClient from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";

const LoginPage = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (icon, title, text, bg, color = "#fff") => {
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: bg,
      color,
      customClass: { popup: "rounded-lg" },
    });
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormValues((v) => ({ ...v, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post("/api/v1/auth/login", formValues);
      if (response.data.success) {
        await login(response.data.token, response.data.user);
        showToast("success", "Login Successful!", "Welcome back!", "#10b981");
        navigate("/");
      } else {
        const msg =
          response.data.message ||
          "Login failed. Please check your credentials.";
        setError(msg);
        showToast("error", "Login Failed", msg, "#ef4444");
      }
    } catch (err) {
      let msg = "Login failed. Please try again.";
      if (err.response) {
        switch (err.response.status) {
          case 400:
            msg = err.response.data.message || "Invalid format.";
            break;
          case 401:
            msg = "Invalid email or password.";
            break;
          case 403:
            msg = "Account disabled.";
            break;
          case 404:
            msg = "User not found.";
            break;
          case 422:
            msg = err.response.data.message || "Invalid input.";
            break;
          case 429:
            msg = "Too many attempts.";
            break;
          case 500:
            msg = "Server error.";
            break;
          default:
            msg = err.response.data.message || msg;
        }
      } else if (err.request) {
        msg = "Network error. Check your connection.";
      }
      setError(msg);
      showToast("error", "Login Failed", msg, "#ef4444");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#0a0e1a] via-[#1a1f3a] to-[#0d1b2a] overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-[15%] left-[15%] w-64 h-64 rounded-full bg-yellow-400/20 blur-[80px] animate-pulse" />
        <div className="absolute bottom-[25%] right-[20%] w-48 h-48 rounded-full bg-orange-400/15 blur-[60px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-yellow-500/10 blur-[100px] animate-pulse delay-500" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass Card Container */}
        <div className="relative p-8 bg-black/20 backdrop-blur-xl border border-yellow-300/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Subtle top border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent" />

          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/5 via-transparent to-black/10 rounded-2xl" />

          {/* Logo & Title */}
          <div className="flex flex-col items-center relative z-10">
            <motion.img
              src="/logo.png"
              alt="Logo"
              className="w-72 drop-shadow-lg mb-4"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />

            <motion.h2
              className="text-xl font-light text-yellow-100 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Welcome back
            </motion.h2>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 mb-2"
            >
              <div className="p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 rounded-lg flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-4 space-y-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-yellow-200">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formValues.email}
                onChange={handleInput}
                className="w-full px-4 py-3 rounded-xl bg-black/30 backdrop-blur-sm border border-yellow-300/30 text-yellow-100 placeholder-yellow-300/50 text-base font-medium transition-all hover:border-yellow-300/50 focus:border-yellow-300/70 focus:bg-black/40 outline-none duration-300 ease-in-out focus:shadow-lg focus:shadow-yellow-300/5"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-yellow-200">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formValues.password}
                  onChange={handleInput}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-black/30 backdrop-blur-sm border border-yellow-300/30 text-yellow-100 placeholder-yellow-300/50 text-base font-medium transition-all hover:border-yellow-300/50 focus:border-yellow-300/70 focus:bg-black/40 outline-none duration-300 ease-in-out focus:shadow-lg focus:shadow-yellow-300/5"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-yellow-300/70 hover:text-yellow-300 focus:text-yellow-200 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-black uppercase font-bold text-base transition-all duration-300 relative overflow-hidden ${
                loading
                  ? "bg-yellow-400/40 cursor-not-allowed opacity-70"
                  : "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-yellow-400/20 transform hover:scale-[1.02] active:scale-[0.98]"
              }`}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 animate-pulse" />
              )}
              <span className="relative z-10 flex items-center justify-center">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin mr-3" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </span>
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
