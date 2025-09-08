// src/pages/Banking.jsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import api from "../api/axios";

/* ---------- Page ---------- */
export default function Banking({ isDemo }) {
  const [activeTab, setActiveTab] = useState("withdrawal"); // 'withdrawal' | 'pending' | 'history'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  console.log("isDemo", isDemo);
  async function fetchTransactions() {
    try {
      setLoading(true);
      const res = await api.get("/transactions/my");
      const rows = Array.isArray(res.data) ? res.data : [];
      // latest first
      rows.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setTransactions(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  const pending = useMemo(
    () =>
      transactions.filter((t) => (t.status || "").toLowerCase() === "pending"),
    [transactions]
  );
  const history = useMemo(
    () =>
      transactions.filter((t) => (t.status || "").toLowerCase() !== "pending"),
    [transactions]
  );

  return (
    <div className="min-h-screen bg-[#0F1420] text-white">
      <Header />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-14">
        {/* Tabs */}
        <div className="bg-[#1A2130] border border-[#2A3245] rounded-xl p-2">
          <div className="flex flex-wrap gap-2">
            <TabButton
              label="Withdrawal"
              active={activeTab === "withdrawal"}
              onClick={() => setActiveTab("withdrawal")}
            />
            <TabButton
              label="Pending Requests"
              active={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
            />
            <TabButton
              label="Request History"
              active={activeTab === "history"}
              onClick={() => setActiveTab("history")}
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === "withdrawal" && (
          <section className="mt-6">
            <h1 className="text-3xl font-extrabold mb-4">Withdrawal</h1>
            <div className="bg-[#1A2130] border border-[#2A3245] rounded-2xl p-5 sm:p-7">
              <div className="bg-[#143C2F]/30 border border-emerald-500/30 text-emerald-200 rounded-xl p-4 mb-6 text-sm">
                Select crypto, enter USD amount, pick the network, then paste{" "}
                <b>your</b> wallet address.
              </div>
              <CryptoWithdrawForm
                onSubmitted={() => {
                  fetchTransactions();
                  setActiveTab("pending");
                }}
              />
            </div>
          </section>
        )}

        {activeTab === "pending" && (
          <section className="mt-6">
            <HeaderRow
              title="Pending Requests"
              subtitle="Showing pending withdrawals and deposits."
              onRefresh={fetchTransactions}
            />
            <DataCard loading={loading}>
              <TxTable rows={pending} emptyText="No pending requests found." />
            </DataCard>
          </section>
        )}

        {activeTab === "history" && (
          <section className="mt-6">
            <HeaderRow
              title="Request History"
              subtitle="All previously processed requests."
              onRefresh={fetchTransactions}
            />
            <DataCard loading={loading}>
              <TxTable rows={history} emptyText="No history yet." />
            </DataCard>
          </section>
        )}
      </main>
    </div>
  );
}

/* ---------- Withdrawal (crypto) form ---------- */
function CryptoWithdrawForm({ onSubmitted }) {
  const CURRENCIES = [
    { value: "USDT_TRC20", label: "USDT (TRC-20)" },
    { value: "USDT_ERC20", label: "USDT (ERC-20)" },
    { value: "USDT_BEP20", label: "USDT (BEP-20)" },
  ];
  const CHAINS = [
    { value: "TRC20", label: "TRC-20 (Tron)" },
    { value: "BEP20", label: "BNB Smart Chain (BEP-20)" },
    { value: "ERC20", label: "Ethereum (ERC-20)" },
  ];

  const [currency, setCurrency] = useState(CURRENCIES[0].value);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("");
  const [addr, setAddr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  function placeholderForChain(c) {
    if (c === "TRC20") return "T... (Tron address)";
    if (c === "BEP20" || c === "ERC20") return "0x... (EVM address)";
    return "Your wallet address";
  }

  async function submit(e) {
    e.preventDefault();
    setMsg({ ok: "", err: "" });

    if (!currency) return setMsg({ ok: "", err: "Select a cryptocurrency." });
    if (!amount || Number(amount) <= 0)
      return setMsg({ ok: "", err: "Enter a valid amount." });
    if (!chain) return setMsg({ ok: "", err: "Select network." });
    if (!addr) return setMsg({ ok: "", err: "Enter your wallet address." });

    try {
      setSubmitting(true);
      await api.post("/transactions/create", {
        type: "withdrawal",
        currency,
        amount,
        chain,
        address: addr,
        method: "crypto",
      });
      setMsg({ ok: "Withdrawal request submitted.", err: "" });
      setAmount("");
      setChain("");
      setAddr("");
      onSubmitted && onSubmitted();
    } catch (e) {
      setMsg({ ok: "", err: e?.response?.data?.message || "Submit failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <Field>
        <Label>Select Your Crypto Currency</Label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <Label>Amount (USD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            $
          </span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-[#121829] text-white border border-[#2A3245] rounded-lg pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </Field>

      <Field>
        <Label>Select network</Label>
        <div className="grid sm:grid-cols-3 gap-3">
          {CHAINS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setChain(opt.value)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                chain === opt.value
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-[#2A3245] bg-[#121829] hover:border-emerald-600/60"
              }`}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">
                {opt.value === "TRC20"
                  ? "Low fees on Tron network"
                  : "EVM network"}
              </div>
            </button>
          ))}
        </div>
      </Field>

      {chain && (
        <Field>
          <Label>Your wallet address (receive on {chain})</Label>
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder={placeholderForChain(chain)}
            className="w-full bg-[#121829] text-white border border-[#2A3245] rounded-lg px-3 py-2.5"
          />
          <div className="text-[12px] text-amber-300/90 mt-2">
            Address/network must match. Wrong network can cause permanent loss.
          </div>
        </Field>
      )}

      {msg.err && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
          {msg.err}
        </div>
      )}
      {msg.ok && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-2">
          {msg.ok}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto rounded-lg bg-[#0B1B7F] hover:brightness-110 px-6 py-3 font-semibold shadow disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Withdrawal"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Tables & helpers ---------- */
function HeaderRow({ title, subtitle, onRefresh }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-300">{subtitle}</p>
        <button
          onClick={onRefresh}
          className="text-sm px-3 py-1.5 rounded-md border border-[#2A3245] hover:bg-[#121829]"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

function DataCard({ children, loading }) {
  return (
    <div className="bg-[#1A2130] border border-[#2A3245] rounded-2xl overflow-hidden">
      <div className="border-t border-[#2A3245] overflow-x-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-400">Loading…</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function TxTable({ rows, emptyText }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-[#121829] text-gray-300">
        <tr>
          <Th>ID</Th>
          <Th>Type</Th>
          <Th>Currency</Th>
          <Th>Amount</Th>
          <Th>Chain</Th>
          <Th>Address</Th>
          <Th>Status</Th>
          <Th>Date</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan="8" className="px-4 py-6 text-center text-gray-400">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.id} className="border-t border-[#2A3245]">
              <Td>{r.id}</Td>
              <Td className="capitalize">{r.type ?? "-"}</Td>
              <Td>{r.currency ?? "-"}</Td>
              <Td>{r.amount ?? "-"}</Td>
              <Td>{r.chain ?? "-"}</Td>
              <Td title={r.address || "-"}>
                {r.address ? (
                  <div className="flex items-center gap-2">
                    <span>{truncateMiddle(r.address, 6, 6)}</span>
                    <CopyBtn text={r.address} />
                  </div>
                ) : (
                  "-"
                )}
              </Td>
              <Td>
                <StatusPill status={r.status} />
              </Td>
              <Td>
                {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function StatusPill({ status = "" }) {
  const s = status.toLowerCase();
  if (s === "approved" || s === "completed" || s === "success")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-200/20 text-emerald-300 font-medium">
        {status}
      </span>
    );
  if (s === "pending")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-200/20 text-amber-300 font-medium">
        {status}
      </span>
    );
  if (s === "rejected" || s === "failed")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-200/20 text-rose-300 font-medium">
        {status}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-200/20 text-slate-300 font-medium">
      {status || "-"}
    </span>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  }
  return (
    <button
      onClick={copy}
      type="button"
      className="text-xs px-2 py-1 rounded border border-[#2A3245] hover:bg-[#121829]"
      title="Copy"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 sm:px-4 py-2 rounded-md transition ${
        active
          ? "bg-[#121829] text-white border border-[#2A3245]"
          : "text-gray-300 hover:bg-[#121829]/60"
      }`}
    >
      <span className="mr-2">•</span>
      {label}
      <span
        className={`absolute left-2 right-2 -bottom-1 h-[2px] ${
          active ? "bg-[#0B1B7F]" : "bg-transparent"
        }`}
      />
    </button>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left font-semibold">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-gray-200 ${className}`}>{children}</td>;
}

function Field({ children }) {
  return <div className="space-y-1">{children}</div>;
}
function Label({ children }) {
  return <label className="block text-sm text-gray-300">{children}</label>;
}

function truncateMiddle(str = "", start = 6, end = 4) {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}…${str.slice(-end)}`;
}
