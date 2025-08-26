import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Header from "../components/Header";

export default function UserProfile() {
  const [user, setUser] = useState({ name: "", email: "", mobile: "" });

  useEffect(() => {
    async function fetchUser() {
      const res = await api.get("/me");
      setUser(res.data);
    }
    fetchUser();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await api.post("/user/update", user);
    alert("Profile updated successfully!");
  }

  return (
    <div className="bg-[#181C23] min-h-screen text-white">
      <Header />
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-[#23272F] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">My Profile</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                type="text"
                className="w-full bg-[#1E2231] p-2 rounded border border-gray-700 focus:outline-none"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full bg-[#1E2231] p-2 rounded border border-gray-700 focus:outline-none"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            </div>
            {"mobile" in user && (
              <div>
                <label className="block text-sm mb-1">Mobile</label>
                <input
                  type="text"
                  className="w-full bg-[#1E2231] p-2 rounded border border-gray-700 focus:outline-none"
                  value={user.mobile || ""}
                  onChange={(e) => setUser({ ...user, mobile: e.target.value })}
                />
              </div>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-semibold"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
