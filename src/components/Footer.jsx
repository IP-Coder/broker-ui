// src/components/Footer.jsx
import React, { useState, useEffect, useCallback } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import PendingOrdersModal from "./PendingOrdersModal";
import OpenOrdersModal from "./OpenOrdersModal";
import TradeHistoryModal from "./TradeHistoryModal";

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
  // no authEndpoint for public channels
});

export default function Footer() {
  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [showPending, setShowPending] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch/refresh account snapshot from your API
  const refreshAccount = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/account`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const json = await res.json();
      if (json.status === "success" && json.account) setAccount(json.account);
    } catch (err) {
      console.error("Account load error:", err);
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  // Merge incoming AccountUpdated payload into local state
  const mergeAccountPatch = useCallback((patch) => {
    console.log("Merging account patch:", patch);
    if (!patch) return;
    console.log("Merging account patch:", patch);
    setAccount((prev) => {
      const next = { ...prev };
      const toNum = (v) => (v == null ? null : Number(v));
      [
        "balance",
        "equity",
        "used_margin",
        "credit",
        "unrealized_profit",
      ].forEach((k) => {
        if (patch[k] !== undefined) next[k] = toNum(patch[k]);
      });
      return next;
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  // Realtime: listen ONLY to AccountUpdated on the user's private channel
  useEffect(() => {
    if (!account?.user_id) return;

    const name = `account.${account.user_id}`;
    const channel = echo.channel(name);
    console.log("Listening to channel:", name);

    const onUpdate = (payload) => mergeAccountPatch(payload);

    // listen because PHP uses ->broadcastAs('AccountUpdated')
    channel.listen(".App\\Events\\AccountUpdated", onUpdate);

    return () => {
      channel.stopListening(".App\\Events\\AccountUpdated");
      echo.leave(name);
    };
  }, [account?.user_id, mergeAccountPatch]);

  // ---- UI helpers ----
  const fmtAmt = (n) =>
    loadingAccount || n == null ? "---" : `$${Number(n).toFixed(2)}`;
  const fmtPct = (n) =>
    loadingAccount || n == null ? "---" : `${Number(n).toFixed(2)}%`;

  const { balance, credit, equity, used_margin } = account || {};
  const freeMargin =
    equity != null && used_margin != null ? equity - used_margin : null;
  const marginLevel =
    equity != null && used_margin != null && Number(used_margin) > 0
      ? (equity / used_margin) * 100
      : null;
  const profitLoss =
    !loadingAccount && equity != null && balance != null
      ? equity - balance
      : null;

  const stats = [
    ["Balance", fmtAmt(balance)],
    ["Credit", fmtAmt(credit)],
    [
      "P / L",
      loadingAccount
        ? "---"
        : `${profitLoss >= 0 ? "+" : "-"}$${Math.abs(profitLoss).toFixed(2)}`,
    ],
    ["Equity", fmtAmt(equity)],
    ["Used Margin", fmtAmt(used_margin)],
    ["Free Margin", fmtAmt(freeMargin)],
    ["Margin Level", fmtPct(marginLevel)],
  ];

  return (
    <>
      <footer className="bg-[#232834] h-14 flex items-center justify-between px-8 border-t border-gray-800">
        <div className="flex space-x-6 overflow-x-auto">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col items-center min-w-[80px]"
            >
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-sm text-white">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowPending(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Pending Orders
          </button>
          <button
            onClick={() => setShowOpen(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Open Orders
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Trade History
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Powered by</span>
            <a
              href="https://forexfeed.net"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/forexfeed-logo.svg" alt="ForexFeed" className="h-4" />
            </a>
          </div>
        </div>
      </footer>

      <PendingOrdersModal
        isOpen={showPending}
        onClose={() => setShowPending(false)}
      />
      <OpenOrdersModal isOpen={showOpen} onClose={() => setShowOpen(false)} />
      <TradeHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
