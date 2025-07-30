import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios"; // Make sure this points to your axios config

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Demo: replace with real API call in production
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/login", { email, password });
      if (data.token) {
        localStorage.removeItem("token");
        localStorage.setItem("token", data.token);
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
      }
    } catch {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-blue-700 mb-8 tracking-tight">
          Sign in to your account
        </h2>
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-gray-600 font-medium"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-gray-600 font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow transition disabled:opacity-50"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
