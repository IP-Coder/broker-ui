// src/components/MobileDashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { socket } from "../socketClient";
import { Toast } from "../noti/Toast";
import { useNotificationSound } from "../noti/useNotificationSound";

// Optional existing modals
import PendingOrdersModal from "./PendingOrdersModal";
import OpenOrdersModal from "./OpenOrdersModal";
import TradeHistoryModal from "./TradeHistoryModal";
import Header from "./Header";

// ---- Trading constants (parity with TradePanel) ----
const PIP_VALUE_PER_LOT = 0.1;
const PIP_FACTOR = 10000;
const ONE_PIP = 1 / PIP_FACTOR;
const FOREXFEED_APP_ID = import.meta.env.VITE_FOREXFEED_APP_ID;

// Normalizes any provider code (“OANDA:EUR_USD” → “EURUSD”)
const normalizeSymbol = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/^(OANDA:|BINANCE:|FXCM:|PEPPERSTONE:)/i, "")
    .replace(/[^A-Z]/g, ""); // drop :, _, / etc.

export default function MobileDashboard({
  selectedSymbol: initialSymbol = "NZDUSD",
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playChime = useNotificationSound();
  const widgetRef = useRef(null);

  // --- Selected symbol (from MobileCoinlist ?symbol=..., else prop)
  const fromQuery = normalizeSymbol(searchParams.get("symbol"));
  const [selectedSymbol, setSelectedSymbol] = useState(
    normalizeSymbol(fromQuery || initialSymbol || "NZDUSD")
  );

  // User / auth
  const [user, setUser] = useState(null);

  // Socket status
  const [socketConnected, setSocketConnected] = useState(false);

  // Live prices
  const [bidPrice, setBidPrice] = useState(null);
  const [askPrice, setAskPrice] = useState(null);
  const initialMidRef = useRef(null);
  const [priceDeltaPct, setPriceDeltaPct] = useState("0.00");

  // Chart timeframe (your UI)
  const [interval, setInterval] = useState("5");
  const [showTimePopup, setShowTimePopup] = useState(false);

  // Lot input
  const [tradeSize, setTradeSize] = useState(0.01);
  const [isEmptyTradeSize, setIsEmptyTradeSize] = useState(false);

  // Advanced (TradePanel parity)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [side, setSide] = useState(""); // "buy" | "sell"
  const [pending, setPending] = useState(false);
  const [orderType, setOrderType] = useState("Buy Limit");
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiry, setExpiry] = useState(new Date().toISOString().slice(0, 16));
  const [atPrice, setAtPrice] = useState("");

  const [useSL, setUseSL] = useState(false);
  const [slPips, setSlPips] = useState(50);
  const [slPrice, setSlPrice] = useState(0);

  const [useTP, setUseTP] = useState(false);
  const [tpPips, setTpPips] = useState(50);
  const [tpPrice, setTpPrice] = useState(0);

  // Calculated vals
  const [lotValueUSD, setLotValueUSD] = useState("--");
  const [requiredMargin, setRequiredMargin] = useState("--");
  const [freeMargin] = useState("0.00");

  // Modals + toasts
  const [showPending, setShowPending] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastData, setToastData] = useState("");
  const [toastType, setToastType] = useState("");
  const [toastTitle, setToastTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timeframes for your picker
  const timeframes = [
    { label: "1 Minute", value: "1" },
    { label: "5 Minutes", value: "5" },
    { label: "15 Minutes", value: "15" },
    { label: "30 Minutes", value: "30" },
    { label: "1 Hour", value: "60" },
    { label: "4 Hours", value: "240" },
    { label: "1 Day", value: "D" },
  ];

  // Keep symbol synced if the query/prop changes
  useEffect(() => {
    const next = normalizeSymbol(
      searchParams.get("symbol") || initialSymbol || "NZDUSD"
    );
    if (next && next !== selectedSymbol) {
      setSelectedSymbol(next);
      initialMidRef.current = null; // reset % baseline
      // reset advanced state on symbol change
      setSide("");
      setPending(false);
      setAtPrice("");
      setUseSL(false);
      setUseTP(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialSymbol]);

  // Initialize user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setUser({ token });
    else navigate("/login");
  }, [navigate]);

  // ---- WebSocket: force connect + status
  useEffect(() => {
    try {
      if (socket && typeof socket.connect === "function" && !socket.connected) {
        socket.connect();
      }
    } catch (e) {
      console.warn("socket.connect() error:", e);
    }
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onErr = (e) => {
      setSocketConnected(false);
      console.warn("Socket error:", e);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onErr);
    socket.on("error", onErr);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onErr);
      socket.off("error", onErr);
    };
  }, []);

  // ---- Subscribe/unsubscribe per symbol (if server expects it)
  useEffect(() => {
    const sym = selectedSymbol;
    try {
      socket.emit?.("subscribe", { symbol: sym });
    } catch {}
    return () => {
      try {
        socket.emit?.("unsubscribe", { symbol: sym });
      } catch {}
    };
  }, [selectedSymbol]);

  // ---- Ticks: handle multiple event names + field shapes
  useEffect(() => {
    const handleTick = (data) => {
      // Support data.code / data.symbol / data.pair / data.instrument
      const raw =
        data?.code ?? data?.symbol ?? data?.pair ?? data?.instrument ?? "";
      const incoming = normalizeSymbol(raw);
      if (!incoming || incoming !== selectedSymbol) return;

      const nb = [
        data?.bid,
        data?.Bid,
        data?.b,
        data?.bestBid,
        data?.best_bid,
      ].find((v) => v != null);
      const na = [
        data?.ask,
        data?.Ask,
        data?.a,
        data?.bestAsk,
        data?.best_ask,
      ].find((v) => v != null);

      if (nb != null) setBidPrice(parseFloat(nb));
      if (na != null) setAskPrice(parseFloat(na));

      const last = data?.last_price ?? data?.last ?? data?.price ?? null;

      const mid =
        last != null
          ? parseFloat(last)
          : nb != null && na != null
          ? (parseFloat(nb) + parseFloat(na)) / 2
          : null;

      if (mid != null) {
        if (initialMidRef.current == null) initialMidRef.current = mid;
        const pct =
          ((mid - initialMidRef.current) / initialMidRef.current) * 100;
        if (isFinite(pct)) setPriceDeltaPct(pct.toFixed(2));
      }
    };

    // Listen to a couple of common names
    socket.on("tick", handleTick);
    socket.on("ticker", handleTick);
    socket.on("price", handleTick);
    return () => {
      socket.off("tick", handleTick);
      socket.off("ticker", handleTick);
      socket.off("price", handleTick);
    };
  }, [selectedSymbol]);

  // ---- TradingView chart (unchanged UI)
  useEffect(() => {
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = initializeChart;
      document.head.appendChild(script);
    } else {
      initializeChart();
    }
    function initializeChart() {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove?.();
        } catch {}
      }
      // eslint-disable-next-line no-undef
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: `OANDA:${selectedSymbol}`,
        interval,
        timezone: "exchange",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#14151f",
        hide_top_toolbar: true,
        withdateranges: false,
        allow_symbol_change: false,
        container_id: "mobile-tradingview-chart",
        hide_side_toolbar: true,
        hide_volume: true,
        hide_legend: true,
        studies: [],
        details: false,
      });
    }
  }, [selectedSymbol, interval]);

  // ---- USD value & required margin (TradePanel logic)
  useEffect(() => {
    let cancelled = false;
    const leverage = 400;
    const base = selectedSymbol.slice(0, 3);
    (async () => {
      try {
        const units = (tradeSize * 100000).toFixed(2);
        const usd = await convertCurrency(units, base);
        if (!cancelled) {
          setLotValueUSD(usd.toFixed(2));
          setRequiredMargin((usd / leverage).toFixed(2));
        }
      } catch {
        if (!cancelled) {
          setLotValueUSD("err");
          setRequiredMargin("err");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tradeSize, selectedSymbol]);

  async function convertCurrency(amount, from) {
    const to = "USD";
    const url = `http://api.forexfeed.net/convert/${FOREXFEED_APP_ID}/${amount}/${from}/${to}`;
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split("\n").map((l) => l.trim());
    const start = lines.indexOf("QUOTE START");
    const end = lines.indexOf("QUOTE END");
    if (start >= 0 && end > start + 1) {
      const val = parseFloat(lines[start + 1].split(",")[6]);
      if (!isNaN(val)) return val;
    }
    throw new Error("Conversion failed");
  }

  // ---- SL/TP linkage (TradePanel parity)
  useEffect(() => {
    if (!side || (bidPrice == null && askPrice == null)) return;
    const entry = side === "buy" ? askPrice : bidPrice;
    if (!entry) return;
    setAtPrice(entry.toFixed(5));
    setSlPrice(
      (entry + (side === "buy" ? -slPips : slPips) * ONE_PIP).toFixed(5)
    );
    setTpPrice(
      (entry + (side === "buy" ? tpPips : -tpPips) * ONE_PIP).toFixed(5)
    );
  }, [side, bidPrice, askPrice, slPips, tpPips]);

  const handleSlPipsChange = (newPips) => {
    setSlPips(newPips);
    if (!atPrice) return;
    const base = parseFloat(atPrice);
    const price =
      side === "buy" ? base - newPips * ONE_PIP : base + newPips * ONE_PIP;
    setSlPrice(price.toFixed(5));
  };
  const handleSlPriceChange = (newPrice) => {
    setSlPrice(newPrice);
    if (!atPrice) return;
    const diff =
      side === "buy"
        ? (parseFloat(atPrice) - newPrice) * PIP_FACTOR
        : (newPrice - parseFloat(atPrice)) * PIP_FACTOR;
    setSlPips(Math.max(0, Math.round(diff)));
  };
  const handleTpPipsChange = (newPips) => {
    setTpPips(newPips);
    if (!atPrice) return;
    const base = parseFloat(atPrice);
    const price =
      side === "buy" ? base + newPips * ONE_PIP : base - newPips * ONE_PIP;
    setTpPrice(price.toFixed(5));
  };
  const handleTpPriceChange = (newPrice) => {
    setTpPrice(newPrice);
    if (!atPrice) return;
    const diff =
      side === "buy"
        ? (newPrice - parseFloat(atPrice)) * PIP_FACTOR
        : (parseFloat(atPrice) - newPrice) * PIP_FACTOR;
    setTpPips(Math.max(0, Math.round(diff)));
  };

  // ---- Lot input behavior (clamp like desktop)
  const onTradeSizeChange = (e) => {
    const v = e.target.value;
    if (v === "") {
      setIsEmptyTradeSize(true);
      return;
    }
    const n = parseFloat(v);
    if (!isNaN(n)) {
      setIsEmptyTradeSize(false);
      setTradeSize(n);
    }
  };
  const onTradeSizeBlur = () => {
    if (isEmptyTradeSize) {
      setTradeSize(0.01);
      setIsEmptyTradeSize(false);
      return;
    }
    if (tradeSize < 0.01) setTradeSize(0.01);
    else if (tradeSize > 100) setTradeSize(100);
    else setTradeSize(+tradeSize.toFixed(2));
  };

  // ---- Derived UI values
  const lotSizeUnits = useMemo(() => tradeSize * 100000, [tradeSize]);
  const pipValue = useMemo(
    () => (tradeSize * PIP_VALUE_PER_LOT).toFixed(2),
    [tradeSize]
  );
  const spread = useMemo(() => {
    if (bidPrice == null || askPrice == null) return "0.0";
    return ((askPrice - bidPrice) * PIP_FACTOR).toFixed(1);
  }, [bidPrice, askPrice]);
  const priceClass =
    Number(priceDeltaPct) > 0
      ? "positive"
      : Number(priceDeltaPct) < 0
      ? "negative"
      : "neutral";

  // ---- Order type derivation (TradePanel)
  const derivedOrderType = useMemo(() => {
    if (!pending) return "market";
    return orderType.split(" ")[1].toLowerCase(); // "limit" | "stop"
  }, [pending, orderType]);

  // ---- Payload builder (TradePanel parity)
  const payload = useMemo(() => {
    const base = {
      symbol: selectedSymbol,
      side,
      order_type: derivedOrderType,
      volume: tradeSize,
      leverage: 400,
      stop_loss_price: useSL ? parseFloat(slPrice) : null,
      take_profit_price: useTP ? parseFloat(tpPrice) : null,
    };
    if (derivedOrderType === "market") {
      base.open_price =
        side === "buy" ? parseFloat(askPrice) : parseFloat(bidPrice);
    }
    if (pending) {
      base.trigger_price = parseFloat(atPrice);
      base.expiry = expiryEnabled ? expiry : null;
    }
    return base;
  }, [
    selectedSymbol,
    side,
    derivedOrderType,
    tradeSize,
    slPrice,
    tpPrice,
    useSL,
    useTP,
    pending,
    atPrice,
    expiry,
    expiryEnabled,
    bidPrice,
    askPrice,
  ]);

  // ---- Validation (TradePanel)
  const isReadyToTrade =
    !!side &&
    (!pending || !!atPrice) &&
    (!useSL || slPips > 0) &&
    (!useTP || tpPips > 0);

  // ---- API normalizer (TradePanel)
  function normalizeApi(json, httpOk = true) {
    if (typeof json?.ok === "boolean") {
      return {
        ok: json.ok,
        code: json.code || (json.ok ? "OK" : "ERROR"),
        message: json.message || "",
        data: json.data ?? null,
        details: json.details,
      };
    }
    if (typeof json?.status === "string") {
      const ok = json.status === "success";
      return {
        ok,
        code: json.code || (ok ? "OK" : "ERROR"),
        message: json.message || "",
        data: json.data ?? null,
        details: json.details,
      };
    }
    return {
      ok: httpOk,
      code: httpOk ? "OK" : "HTTP_ERROR",
      message: json?.message || "",
      data: json ?? null,
      details: json?.details,
    };
  }

  // ---- Place advanced order (market or pending, uses full payload)
  const placeAdvancedOrder = async () => {
    if (!user?.token) return navigate("/login");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      let body;
      try {
        body = await res.json();
      } catch {
        body = { message: "Invalid JSON from server" };
      }
      const norm = normalizeApi(body, res.ok);

      if (!res.ok || !norm.ok) {
        let title = "Trade Rejected";
        let type = "error";
        let desc = norm.message || "Request failed.";
        if (norm.code === "INSUFFICIENT_MARGIN") {
          title = "Insufficient Margin make Deposit First";
          type = "warning";
        } else if (norm.code === "VOLUME_STEP_INVALID") {
          title = "Invalid Volume Step";
          type = "warning";
          const d = norm.details || {};
          if (d.step != null && d.requested != null)
            desc = `Volume must be in steps of ${d.step}. You entered ${d.requested}.`;
        } else if (norm.code === "VOLUME_OUT_OF_RANGE") {
          title = "Volume Out of Range";
          type = "warning";
          const d = norm.details || {};
          if (d.min != null && d.max != null && d.requested != null)
            desc = `Allowed: ${d.min}–${d.max}. You entered ${d.requested}.`;
        } else if (body?.errors) {
          title = "Validation Error";
          type = "error";
          const list = Object.values(body.errors).flat();
          desc = list.join(" • ");
        }
        setToastTitle(title);
        setToastData(desc);
        setToastType(type);
        setToastOpen(true);
        return;
      }
      const successTitle =
        norm.code === "ORDER_QUEUED"
          ? "Order Queued"
          : "Trade Placed Successfully";
      setToastTitle(successTitle);
      setToastData(norm.message || "Your order has been accepted.");
      setToastType("success");
      setToastOpen(true);
      playChime();
    } catch (err) {
      console.error("Network error:", err);
      setToastTitle("Network Error");
      setToastData("We couldn't reach the server. Please try again.");
      setToastType("error");
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Market buttons (bottom bar)
  const placeMarketTrade = async (actionSide) => {
    if (!user?.token) return navigate("/login");
    if (
      (actionSide === "buy" && !askPrice) ||
      (actionSide === "sell" && !bidPrice)
    ) {
      setToastTitle("Prices Unavailable");
      setToastData("Waiting for live prices. Try again in a moment.");
      setToastType("warning");
      setToastOpen(true);
      return;
    }
    setIsSubmitting(true);
    const marketPayload = {
      symbol: selectedSymbol,
      side: actionSide,
      order_type: "market",
      volume: Number(tradeSize),
      leverage: 400,
      open_price: actionSide === "buy" ? Number(askPrice) : Number(bidPrice),
      stop_loss_price: useSL ? parseFloat(slPrice) : null,
      take_profit_price: useTP ? parseFloat(tpPrice) : null,
    };
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(marketPayload),
      });
      let body;
      try {
        body = await res.json();
      } catch {
        body = { message: "Invalid JSON from server" };
      }
      const norm = normalizeApi(body, res.ok);
      if (!res.ok || !norm.ok) {
        let title = "Trade Rejected";
        let type = "error";
        let desc = norm.message || "Request failed.";
        if (norm.code === "INSUFFICIENT_MARGIN") {
          title = "Insufficient Margin make Deposit First";
          type = "warning";
        } else if (norm.code === "VOLUME_STEP_INVALID") {
          title = "Invalid Volume Step";
          type = "warning";
          const d = norm.details || {};
          if (d.step != null && d.requested != null)
            desc = `Volume must be in steps of ${d.step}. You entered ${d.requested}.`;
        } else if (norm.code === "VOLUME_OUT_OF_RANGE") {
          title = "Volume Out of Range";
          type = "warning";
          const d = norm.details || {};
          if (d.min != null && d.max != null && d.requested != null)
            desc = `Allowed: ${d.min}–${d.max}. You entered ${d.requested}.`;
        } else if (body?.errors) {
          title = "Validation Error";
          type = "error";
          const list = Object.values(body.errors).flat();
          desc = list.join(" • ");
        }
        setToastTitle(title);
        setToastData(desc);
        setToastType(type);
        setToastOpen(true);
        return;
      }
      const successTitle =
        norm.code === "ORDER_QUEUED"
          ? "Order Queued"
          : "Trade Placed Successfully";
      setToastTitle(successTitle);
      setToastData(
        `${actionSide.toUpperCase()} ${tradeSize} lots ${selectedSymbol}`
      );
      setToastType("success");
      setToastOpen(true);
      playChime();
    } catch (err) {
      console.error("Network error:", err);
      setToastTitle("Network Error");
      setToastData("We couldn't reach the server. Please try again.");
      setToastType("error");
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mobile-trading-dashboard">
      <style jsx>{`
        .mobile-trading-dashboard {
          font-family: "Segoe UI", Roboto, Arial, sans-serif;
          background: #1e1f2a;
          color: white;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          line-height: 1.5;
          overflow-x: hidden;
        }
        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #14151f;
          border-bottom: 1px solid #333;
        }
        .back-button {
          background: none;
          border: none;
          color: #00e092;
          font-size: 16px;
          cursor: pointer;
          padding: 8px 0;
        }
        .header-title {
          color: white;
          font-size: 18px;
          font-weight: 600;
        }
        .market-status {
          background: #3c3f50;
          text-align: center;
          padding: 10px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chart-header {
          text-align: center;
          padding: 20px 0 10px;
          cursor: pointer;
        }
        .chart-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .dropdown-arrow {
          font-size: 12px;
        }
        .price {
          font-size: 20px;
          margin-top: 8px;
          font-weight: 600;
        }
        .positive {
          color: #00e092;
        }
        .negative {
          color: #e04d4d;
        }
        .neutral {
          color: #cccccc;
        }
        .chart-container {
          position: relative;
          margin: 10px;
          border-radius: 8px;
          overflow: hidden;
          height: 400px;
        }
        #mobile-tradingview-chart {
          width: 100%;
          height: 100%;
          background: #14151f;
          border: 1px solid #333;
          border-radius: 8px;
        }
        .trade-info {
          display: flex;
          justify-content: space-around;
          padding: 12px 0;
          font-size: 13px;
          background: #2a2c3a;
          flex-wrap: wrap;
          gap: 10px;
        }
        .trade-info div {
          padding: 0 10px;
          text-align: center;
          white-space: nowrap;
        }
        .controls {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 12px 10px;
          background: #1f202c;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          flex-wrap: wrap;
          gap: 10px;
        }
        .time-dropdown {
          position: relative;
        }
        .time-box {
          background: #2d2f3e;
          padding: 7px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          color: white;
        }
        .time-box:hover {
          background: #3d3f4e;
        }
        .lot-input-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #2d2f3e;
          padding: 8px 10px;
          border-radius: 8px;
        }
        .lot-input {
          width: 90px;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          text-align: right;
          font-size: 14px;
        }
        .lot-suffix {
          font-size: 12px;
          color: #c9c9c9;
        }
        .adv-toggle {
          background: #2d2f3e;
          padding: 7px 12px;
          border-radius: 8px;
          border: none;
          color: #fff;
        }
        .adv-wrap {
          background: #1e1f2a;
          border-top: 1px solid #333;
          padding: 12px;
        }
        .adv-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
        }
        .box {
          background: #1a1f27;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 8px;
          color: white;
        }
        .box input,
        .box select {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          text-align: right;
        }
        .side-row {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        .btn-sell {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e04d4d;
          color: #e04d4d;
          background: transparent;
        }
        .btn-buy {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #00e092;
          color: #00e092;
          background: transparent;
        }
        .btn-sell.active {
          background: #e04d4d33;
          color: #fff;
        }
        .btn-buy.active {
          background: #00e09233;
          color: #fff;
        }
        .place-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: #2563eb;
          color: white;
          font-weight: 600;
        }
        .spread {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e1f2a;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          color: #ccc;
          border: 1px solid #333;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          z-index: 10;
          white-space: nowrap;
        }
        .bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #14151f;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 12px;
          border-top: 1px solid #333;
          gap: 12px;
        }
        .sell,
        .buy {
          flex: 1;
          padding: 16px 12px;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          border-radius: 8px;
          color: #fff;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sell {
          background: #e04d4d;
        }
        .sell:hover:not(:disabled) {
          background: #d04242;
        }
        .buy {
          background: #00e092;
          color: #000;
        }
        .buy:hover:not(:disabled) {
          background: #00c982;
        }
        .sell:disabled,
        .buy:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .price-value {
          font-size: 16px;
          margin-top: 4px;
          font-weight: 600;
        }
        @media (max-width: 600px) {
          .chart-container {
            height: 300px;
          }
          .trade-info {
            font-size: 11px;
          }
          .controls {
            padding: 10px 8px;
            gap: 8px;
          }
          .sell,
          .buy {
            font-size: 16px;
          }
        }
        @media (max-width: 400px) {
          .chart-container {
            height: 250px;
          }
          .trade-info {
            font-size: 10px;
          }
          .sell,
          .buy {
            font-size: 15px;
            padding: 12px 6px;
          }
        }
      `}</style>
      <Header />

      {/* Header */}
      <div className="mobile-header">
        <button className="back-button" onClick={() => navigate("/markets")}>
          ← Back to Markets
        </button>
      </div>

      {/* Chart Header (tap -> open orders modal, same as your UI idea) */}
      <div className="chart-header" onClick={() => setShowOpen(true)}>
        <h2>
          {selectedSymbol} <span className="dropdown-arrow">▼</span>
        </h2>
        <div className={`price ${priceClass}`}>
          {bidPrice != null ? bidPrice.toFixed(5) : "--"}{" "}
          <span>
            ({Number(priceDeltaPct) >= 0 ? "+" : ""}
            {priceDeltaPct}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <div id="mobile-tradingview-chart"></div>
      </div>

      {/* Trade Info */}
      <div className="trade-info">
        <div>Pips Value: ${pipValue}</div>
        <div>Required Margin: ${requiredMargin}</div>
        <div>Free Margin: ${freeMargin}</div>
      </div>

      {/* Controls */}
      <div className="controls">
        {/* Timeframe */}
        <div className="time-dropdown">
          <button
            className="time-box"
            onClick={() => setShowTimePopup(!showTimePopup)}
          >
            <span>🕐</span>{" "}
            {timeframes.find((t) => t.value === interval)?.label || "5 Minutes"}
          </button>
          {!showTimePopup ? null : (
            <div className="time-popup">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  className={`time-box ${
                    interval === tf.value ? "active" : ""
                  }`}
                  onClick={() => {
                    setInterval(tf.value);
                    setShowTimePopup(false);
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editable Lot input */}
        <div className="lot-input-wrap" title="Lot size">
          <span>👤</span>
          <input
            className="lot-input"
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            value={isEmptyTradeSize ? "" : tradeSize}
            onChange={onTradeSizeChange}
            onBlur={onTradeSizeBlur}
            inputMode="decimal"
          />
          <span className="lot-suffix">Lot</span>
        </div>

        {/* Advanced toggle */}
        <button
          className="adv-toggle"
          onClick={() => setShowAdvanced((s) => !s)}
        >
          ⚙️ {showAdvanced ? "Hide" : "Advanced"}
        </button>

        {/* Quick modals */}
        <button className="time-box" onClick={() => setShowPending(true)}>
          <span>⏱️</span> Pending
        </button>
        <button className="time-box" onClick={() => setShowHistory(true)}>
          <span>📊</span> History
        </button>
      </div>

      {/* Advanced area (TradePanel features) */}
      {showAdvanced && (
        <div className="adv-wrap">
          <div className="side-row">
            <button
              className={`btn-sell ${side === "sell" ? "active" : ""}`}
              onClick={() => setSide("sell")}
            >
              SELL {bidPrice != null ? bidPrice.toFixed(5) : "--"}
            </button>
            <button
              className={`btn-buy ${side === "buy" ? "active" : ""}`}
              onClick={() => setSide("buy")}
            >
              BUY {askPrice != null ? askPrice.toFixed(5) : "--"}
            </button>
          </div>

          <div className="adv-row">
            <div>Set pending order</div>
            <div style={{ textAlign: "right" }}>
              <input
                type="checkbox"
                checked={pending}
                onChange={() => setPending((p) => !p)}
                disabled={!side}
              />
            </div>
          </div>

          {pending && (
            <>
              <div className="adv-row">
                <div>At price</div>
                <div className="box">
                  <input
                    type="number"
                    step="0.00001"
                    value={atPrice}
                    onChange={(e) => setAtPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="adv-row">
                <div>Type</div>
                <div className="box">
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                  >
                    {["Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div className="adv-row">
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={expiryEnabled}
                    onChange={() => setExpiryEnabled((e) => !e)}
                  />
                  Expiry
                </label>
                <div className="box">
                  <input
                    type="datetime-local"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    disabled={!expiryEnabled}
                  />
                </div>
              </div>
            </>
          )}

          <div className="adv-row">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={useSL}
                onChange={() => setUseSL((u) => !u)}
                disabled={!side}
              />
              Stop Loss
            </label>
            <div className="box">
              <input
                type="number"
                min={0}
                step={1}
                value={slPips}
                onChange={(e) => handleSlPipsChange(+e.target.value)}
                disabled={!useSL}
              />
            </div>
          </div>
          <div className="adv-row">
            <div>SL Price</div>
            <div className="box">
              <input
                type="number"
                step="0.00001"
                value={slPrice}
                onChange={(e) => handleSlPriceChange(+e.target.value)}
                disabled={!useSL}
              />
            </div>
          </div>

          <div className="adv-row">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={useTP}
                onChange={() => setUseTP((u) => !u)}
                disabled={!side}
              />
              Take Profit
            </label>
            <div className="box">
              <input
                type="number"
                min={0}
                step={1}
                value={tpPips}
                onChange={(e) => handleTpPipsChange(+e.target.value)}
                disabled={!useTP}
              />
            </div>
          </div>
          <div className="adv-row">
            <div>TP Price</div>
            <div className="box">
              <input
                type="number"
                step="0.00001"
                value={tpPrice}
                onChange={(e) => handleTpPriceChange(+e.target.value)}
                disabled={!useTP}
              />
            </div>
          </div>

          <button
            className="place-btn"
            onClick={placeAdvancedOrder}
            disabled={!isReadyToTrade || isSubmitting}
          >
            {isSubmitting ? "Placing..." : "Place Order"}
          </button>

          <div className="trade-info" style={{ marginTop: 8 }}>
            <div>
              {tradeSize.toFixed(2)} Lot: {lotSizeUnits.toLocaleString()}{" "}
              {selectedSymbol.slice(0, 3)}
            </div>
            <div>Pip Value: ${pipValue}</div>
            <div>
              Required Margin:{" "}
              {requiredMargin === "--" ? "…" : `$${requiredMargin}`}
            </div>
            <div>Spread: {spread} Pips</div>
          </div>
        </div>
      )}

      {/* Spread pill */}
      <div className="spread">{spread} PIPS</div>

      {/* Bottom bar (market orders) */}
      <div className="bottom-bar">
        <button
          className="sell"
          onClick={() => {
            setSide("sell");
            placeMarketTrade("sell");
          }}
          disabled={isSubmitting || bidPrice == null}
        >
          SELL
          <div className="price-value">
            {bidPrice != null ? bidPrice.toFixed(5) : "--"}
          </div>
        </button>
        <button
          className="buy"
          onClick={() => {
            setSide("buy");
            placeMarketTrade("buy");
          }}
          disabled={isSubmitting || askPrice == null}
        >
          BUY
          <div className="price-value">
            {askPrice != null ? askPrice.toFixed(5) : "--"}
          </div>
        </button>
      </div>

      {/* Toast */}
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        title={toastTitle}
        description={toastData}
        type={toastType}
      />

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
    </div>
  );
}
