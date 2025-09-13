import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { socket } from "../socketClient"; // ⚠️ adjust path if needed

// Pusher setup (same as Footer)
window.Pusher = Pusher;
const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
});

export default function MobileWallet() {
  const navigate = useNavigate();

  // --- original UI state, now driven dynamically ---
  const [walletData, setWalletData] = useState({
    balance: 0.0,
    equity: 0.0,
    freeMargin: 0.0,
    marginLevel: 0.0,
  });

  // --------- Dynamic logic borrowed from Footer ---------
  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [openOrders, setOpenOrders] = useState([]);
  const [liveTicks, setLiveTicks] = useState({}); // { "EURUSD": {bid, ask}, ... }

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

  const balance = account?.balance != null ? Number(account.balance) : null;
  const credit = account?.credit != null ? Number(account.credit) : 0;
  const equity = account?.equity != null ? Number(account.equity) : null;
  const used_margin =
    account?.used_margin != null ? Number(account.used_margin) : null;

  // Prefer LIVE open PnL; fallback to equity - balance
  const equityLive =
    balance != null
      ? balance + credit + (isFinite(liveOpenPnL) ? liveOpenPnL : 0)
      : null;
  const freeMargin =
    equity != null && used_margin != null ? equity - used_margin : null;
  const marginLevel =
    equity != null && used_margin != null && Number(used_margin) > 0
      ? (equity / used_margin) * 100
      : null;

  // Drive the original walletData numbers without changing the UI markup
  useEffect(() => {
    const safe = (n) => (isFinite(n) ? Number(n) : 0);
    setWalletData({
      balance: safe(balance),
      equity: safe(isFinite(equityLive) ? equityLive : equity),
      freeMargin: safe(freeMargin),
      marginLevel: safe(marginLevel),
    });
  }, [
    balance,
    credit,
    equity,
    used_margin,
    equityLive,
    freeMargin,
    marginLevel,
  ]);

  // --------- Original UI (unchanged) ---------
  const handleBack = () => {
    navigate("/markets");
  };

  const handleDeposit = () => {
    navigate("/deposit");
  };

  const handleWithdraw = () => {
    navigate("/withdrawal");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#2d2d2d",
          padding: "15px 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #333",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            color: "#ffffff",
            fontSize: "18px",
            marginRight: "15px",
            cursor: "pointer",
          }}
          onClick={handleBack}
        >
          ←
        </button>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: "0" }}>
          Wallet
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: "20px", paddingBottom: "100px" }}>
        {/* Balance Card */}
        <div
          style={{
            backgroundColor: "#2d2d2d",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid #333",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ color: "#cccccc", fontSize: "14px" }}>
              Account Balance
            </span>
            <span
              style={{ color: "#4CAF50", fontSize: "24px", fontWeight: "bold" }}
            >
              ${walletData.balance.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ color: "#cccccc", fontSize: "14px" }}>Equity</span>
            <span
              style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}
            >
              ${walletData.equity.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <span style={{ color: "#cccccc", fontSize: "14px" }}>
              Free Margin
            </span>
            <span
              style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}
            >
              ${walletData.freeMargin.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#cccccc", fontSize: "14px" }}>
              Margin Level
            </span>
            <span
              style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}
            >
              {walletData.marginLevel}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
          <button
            style={{
              flex: 1,
              backgroundColor: "#4CAF50",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "15px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={handleDeposit}
          >
            Deposit
          </button>
          <button
            style={{
              flex: 1,
              backgroundColor: "#f44336",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "15px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={handleWithdraw}
          >
            Withdraw
          </button>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: "30px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "15px",
              color: "#ffffff",
            }}
          >
            Quick Actions
          </h2>

          <div
            style={{
              backgroundColor: "#2d2d2d",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #333",
              cursor: "pointer",
            }}
            onClick={() => navigate("/trade-history")}
          >
            <span style={{ color: "#ffffff", fontSize: "16px" }}>
              Trade History
            </span>
            <span style={{ color: "#cccccc", fontSize: "18px" }}>→</span>
          </div>

          <div
            style={{
              backgroundColor: "#2d2d2d",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #333",
              cursor: "pointer",
            }}
            onClick={() => navigate("/open-orders")}
          >
            <span style={{ color: "#ffffff", fontSize: "16px" }}>
              Open Orders
            </span>
            <span style={{ color: "#cccccc", fontSize: "18px" }}>→</span>
          </div>

          <div
            style={{
              backgroundColor: "#2d2d2d",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #333",
              cursor: "pointer",
            }}
            onClick={() => navigate("/pending-orders")}
          >
            <span style={{ color: "#ffffff", fontSize: "16px" }}>
              Pending Orders
            </span>
            <span style={{ color: "#cccccc", fontSize: "18px" }}>→</span>
          </div>

          <div
            style={{
              backgroundColor: "#2d2d2d",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #333",
              cursor: "pointer",
            }}
            onClick={() => navigate("/account-settings")}
          >
            <span style={{ color: "#ffffff", fontSize: "16px" }}>
              Account Settings
            </span>
            <span style={{ color: "#cccccc", fontSize: "18px" }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
