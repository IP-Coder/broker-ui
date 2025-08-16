// src/components/Footer.jsx
import React, { useState, useEffect } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import PendingOrdersModal from "./PendingOrdersModal";
import OpenOrdersModal from "./OpenOrdersModal";
import TradeHistoryModal from "./TradeHistoryModal";

// Initialize Pusher/Echo
window.Pusher = Pusher;
const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
  authEndpoint: "/sanctum/csrf-cookie",
  auth: {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  },
});

export default function Footer() {
  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  // Modal visibility
  const [showPending, setShowPending] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 1) Fetch account on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchAccount() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/account`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const json = await res.json();
        if (json.status === "success" && json.account) {
          isMounted && setAccount(json.account);
        }
      } catch (err) {
        console.error("Account load error:", err);
      } finally {
        isMounted && setLoadingAccount(false);
      }
    }
    fetchAccount();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2) Real-time updates via Echo (still in Footer)
  useEffect(() => {
    if (!account?.user_id) return;
    const channel = echo.private(`account.${account.user_id}`);
    channel.listen("OrderPendingCreated", (payload) => {
      // you can handle real-time events here or inside modals as desired
    });
    channel.listen("OrderOpened", (payload) => {
      //
    });
    channel.listen("OrderClosed", (payload) => {
      //
    });
    return () => {
      channel.stopListening("OrderPendingCreated");
      channel.stopListening("OrderOpened");
      channel.stopListening("OrderClosed");
      echo.leaveChannel(`account.${account.user_id}`);
    };
  }, [account?.user_id]);

  // Format helpers (unchanged)
  const fmtAmt = (n) =>
    loadingAccount || n == null ? "---" : `$${Number(n).toFixed(2)}`;
  const fmtPct = (n) =>
    loadingAccount || n == null ? "---" : `${Number(n).toFixed(2)}%`;

  const { balance, credit, equity, used_margin } = account || {};
  const freeMargin =
    equity != null && used_margin != null ? equity - used_margin : null;
  const marginLevel =
    equity != null && used_margin != null ? (equity / used_margin) * 100 : null;
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
