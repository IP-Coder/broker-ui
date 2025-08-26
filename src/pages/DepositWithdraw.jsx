import React, { useState, useEffect } from "react";
import api from "../api/axios";
import Header from "../components/Header";

export default function DepositWithdraw() {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("deposit");
  const [transactions, setTransactions] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/transactions/create", { type, amount });
    setAmount("");
    fetchTransactions();
  }

  async function fetchTransactions() {
    const res = await api.get("/transactions/my");
    setTransactions(res.data);
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="bg-[#181C23] min-h-screen text-white">
      <Header />
      <div className="container mx-auto p-6 max-w-3xl">
        {/* Form */}
        <div className="bg-[#23272F] p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Deposit / Withdraw</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Transaction Type</label>
              <select
                className="w-full bg-[#1E2231] p-2 rounded border border-gray-700"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Amount (USD)</label>
              <input
                type="number"
                className="w-full bg-[#1E2231] p-2 rounded border border-gray-700"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded font-semibold"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Transactions */}
        <div className="bg-[#23272F] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">My Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-700">
              <thead className="bg-[#1E2231]">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-t border-gray-700">
                      <td className="px-4 py-2">{t.id}</td>
                      <td className="px-4 py-2">{t.type}</td>
                      <td className="px-4 py-2">${t.amount}</td>
                      <td
                        className={`px-4 py-2 font-bold ${
                          t.status === "approved"
                            ? "text-green-500"
                            : t.status === "rejected"
                            ? "text-red-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {t.status}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
