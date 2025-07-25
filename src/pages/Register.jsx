import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios"; // Adjust this path if needed

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password_confirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/register", {
        name,
        email,
        password,
        password_confirmation,
      });
      if (data.token) {
        localStorage.setItem("token", data.token);
        navigate("/");
      }
    } catch {
      setError("Registration failed. Please check your info.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-blue-700 mb-8 tracking-tight">
          Create your account
        </h2>
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label htmlFor="name" className="block mb-1 text-gray-600 font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block mb-1 text-gray-600 font-medium">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 text-gray-600 font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="password_confirmation" className="block mb-1 text-gray-600 font-medium">
              Confirm Password
            </label>
            <input
              id="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              value={password_confirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow transition disabled:opacity-50"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
