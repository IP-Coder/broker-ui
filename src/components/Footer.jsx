// src/components/Footer.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { socket } from "../socketClient"; // ✅ same as OpenOrdersModal
import PendingOrdersModal from "./PendingOrdersModal";
import OpenOrdersModal from "./OpenOrdersModal";
import TradeHistoryModal from "./TradeHistoryModal";

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
});

export default function Footer() {
  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [showPending, setShowPending] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 👉 for LIVE P/L
  const [openOrders, setOpenOrders] = useState([]);
  const [liveTicks, setLiveTicks] = useState({}); // { "EURUSD": {bid, ask}, ... }

  // --------- API loaders ---------
  const refreshAccount = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/account`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const json = await res.json();
      if (json?.status === "success" && json.account) setAccount(json.account);
    } catch (e) {
      console.error("Account load error:", e);
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  const refreshOpenOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders?status=open`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setOpenOrders(data?.orders || []);
    } catch (e) {
      console.error("Open orders load error:", e);
    }
  }, []);

  useEffect(() => {
    refreshAccount();
    refreshOpenOrders();
  }, [refreshAccount, refreshOpenOrders]);

  // --------- Laravel Echo: AccountUpdated ---------
  const mergeAccountPatch = useCallback((patch) => {
    if (!patch) return;
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

  useEffect(() => {
    if (!account?.user_id) return;
    const name = `account.${account.user_id}`;
    const channel = echo.channel(name);
    const onUpdate = (payload) => mergeAccountPatch(payload);
    channel.listen(".App\\Events\\AccountUpdated", onUpdate);
    return () => {
      channel.stopListening(".App\\Events\\AccountUpdated");
      echo.leave(name);
    };
  }, [account?.user_id, mergeAccountPatch]);

  // --------- Socket ticks for LIVE P/L ---------
  useEffect(() => {
    const handleTick = (data) => {
      if (!data?.code) return;
      const symbol = String(data.code).replace("OANDA:", "");
      if (data.bid && data.ask) {
        setLiveTicks((prev) => ({
          ...prev,
          [symbol]: { bid: parseFloat(data.bid), ask: parseFloat(data.ask) },
        }));
      }
    };
    socket.on("tick", handleTick);
    return () => socket.off("tick", handleTick);
  }, []);

  // --------- Helpers / derived ---------
  const getContractSize = (symbol) =>
    /^[A-Z]{6}$/.test(symbol || "") ? 100000 : 1; // FX pairs → 100k/lot

  // Sum of all open positions PnL using live ticks
  const liveOpenPnL = useMemo(() => {
    if (!openOrders?.length) return 0;
    return openOrders.reduce((sum, o) => {
      const s = o.symbol;
      const lots = parseFloat(o.volume || 0);
      const entry = parseFloat(o.open_price || 0);
      const ticks = liveTicks[s] || {};
      const current =
        o.type === "sell"
          ? parseFloat(ticks.ask ?? o.live_price)
          : parseFloat(ticks.bid ?? o.live_price);
      if (!isFinite(current) || !isFinite(entry) || !isFinite(lots)) return sum;
      const dir = o.type === "sell" ? -1 : 1;
      const cs = getContractSize(s);
      const pnl = (current - entry) * cs * lots * dir;
      return sum + pnl;
    }, 0);
  }, [openOrders, liveTicks]);

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

  // Prefer LIVE open PnL; fallback to equity - balance
  const profitLoss = !loadingAccount
    ? isFinite(liveOpenPnL)
      ? liveOpenPnL
      : equity != null && balance != null
      ? equity - balance
      : null
    : null;

  // (Optional) show equity with live PnL preview
  const equityLive =
    balance != null
      ? Number(balance) +
        (credit ? Number(credit) : 0) +
        (isFinite(liveOpenPnL) ? liveOpenPnL : 0)
      : null;

  // 👉 NEW: P/L display text + color class
  const pnlDisplay =
    loadingAccount || profitLoss == null
      ? "---"
      : `${profitLoss >= 0 ? "+" : "-"}$${Math.abs(profitLoss).toFixed(2)}`;

  const pnlClass =
    loadingAccount || profitLoss == null
      ? ""
      : profitLoss > 0
      ? "text-green-400"
      : profitLoss < 0
      ? "text-red-400"
      : "text-gray-100";

  // ✅ stats ko object ke रूप me rakha hai taaki P/L pe class apply ho sake
  const stats = [
    { label: "Balance", value: fmtAmt(balance) },
    { label: "P / L", value: pnlDisplay, className: pnlClass }, // <- colored
    {
      label: "Equity",
      value: fmtAmt(isFinite(equityLive) ? equityLive : equity),
    },
    { label: "Used Margin", value: fmtAmt(used_margin) },
    { label: "Free Margin", value: fmtAmt(freeMargin) },
    { label: "Margin Level", value: fmtPct(marginLevel) },
  ];

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-gray-100 border-t border-gray-700">
        <div className="max-w-11xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Stats */}
            <ul className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm">
              {stats.map(({ label, value, className }) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="text-gray-400">{label}:</span>
                  {/* 👉 yahan conditional color apply ho raha hai */}
                  <span className={`font-semibold ${className || ""}`}>
                    {value}
                  </span>
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPending(true)}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Pending Trades
              </button>
              <button
                onClick={() => setShowOpen(true)}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Open Trades
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Trade History
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
