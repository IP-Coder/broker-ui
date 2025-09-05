// src/components/TradePanel.jsx
import React, { useState, useEffect, useMemo } from "react";
import { socket } from "../socketClient"; // ✅ Socket.IO client
import { Toast } from "../noti/Toast";
import { useNotificationSound } from "../noti/useNotificationSound";
import { flagsData } from "./flagsdata"; // ✅ country code to flag mapping
const FOREXFEED_APP_ID = import.meta.env.VITE_FOREXFEED_APP_ID;
import UpIcon from "../assets/icons/up.svg"; // ⬆ आपका SVG
import DownIcon from "../assets/icons/down.svg"; // ⬇ आपका SVG

// Helpers

// 1 pip = 0.0001 for EURUSD
const PIP_VALUE_PER_LOT = 0.1;
const PIP_FACTOR = 10000;
const ONE_PIP = 1 / PIP_FACTOR;

export default function TradePanel({
  symbol = "EURUSD",
  user,
  onTradeSuccess,
}) {
  const [tab, setTab] = useState("Market execution");
  const [tradeSize, setTradeSize] = useState(0.01);
  const [side, setSide] = useState("");
  const [pending, setPending] = useState(false);
  const [atPrice, setAtPrice] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [toastData, setToastData] = useState("");
  const [toastType, setToastType] = useState("");
  const [toastTitle, setToastTitle] = useState("");
  const playChime = useNotificationSound();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderType, setOrderType] = useState("Buy Limit");
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiry, setExpiry] = useState(new Date().toISOString().slice(0, 16));

  const [useSL, setUseSL] = useState(false);
  const [slPips, setSlPips] = useState(50);
  const [slPrice, setSlPrice] = useState(0);
  const [useTP, setUseTP] = useState(false);
  const [tpPips, setTpPips] = useState(50);
  const [tpPrice, setTpPrice] = useState(0);

  const [bidPrice, setBidPrice] = useState(null);
  const [askPrice, setAskPrice] = useState(null);

  const [lotValueUSD, setLotValueUSD] = useState("--");
  const [requiredMargin, setRequiredMargin] = useState("--");
  // const [tradeSize, setTradeSize] = useState(0.01);

  const increase = () => setTradeSize((prev) => +(prev + 0.01).toFixed(2));
  const decrease = () =>
    setTradeSize((prev) => Math.max(0.01, +(prev - 0.01).toFixed(2)));
  const flatFlags = Array.isArray(flagsData[0]) ? flagsData[0] : flagsData;
  const baseCode = symbol.slice(0, 3);
  const quoteCode = symbol.slice(3, 6);

  const baseFlagObj = flatFlags.find((f) => f.code === baseCode);
  const quoteFlagObj = flatFlags.find((f) => f.code === quoteCode);

  // Subscribe to live ticks
  useEffect(() => {
    const handleTick = (data) => {
      const incoming = data.code?.replace("OANDA:", "");
      if (incoming !== symbol) return;
      if (data.bid) setBidPrice(parseFloat(data.bid));
      if (data.ask) setAskPrice(parseFloat(data.ask));
    };
    socket.on("tick", handleTick);
    return () => socket.off("tick", handleTick);
  }, [symbol]);

  const lotSizeUnits = useMemo(() => tradeSize * 100000, [tradeSize]);
  const pipValue = useMemo(
    () => (tradeSize * PIP_VALUE_PER_LOT).toFixed(2),
    [tradeSize]
  );
  const spread = useMemo(() => {
    if (bidPrice == null || askPrice == null) return "--";
    return ((askPrice - bidPrice) * PIP_FACTOR).toFixed(1);
  }, [bidPrice, askPrice]);

  // Auto‐set entry, SL & TP whenever side or pip inputs change
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

  // Fetch USD value & required margin
  useEffect(() => {
    let cancelled = false;
    const leverage = 400;
    const base = symbol.slice(0, 3);
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
  }, [tradeSize, symbol]);

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

  // Handlers for SL / TP inputs
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

  const derivedOrderType = useMemo(() => {
    if (!pending) return "market"; // ✅ Only use 'limit' or 'stop' if pending toggle is on
    return orderType.split(" ")[1].toLowerCase();
  }, [pending, orderType]);

  // Build payload
  const payload = useMemo(() => {
    const base = {
      symbol,
      side,
      order_type: derivedOrderType,
      volume: tradeSize,
      leverage: 400,
      stop_loss_price: useSL ? parseFloat(slPrice) : null,
      take_profit_price: useTP ? parseFloat(tpPrice) : null,
    };

    // Always include open_price if it's a market order
    if (derivedOrderType === "market") {
      base.open_price =
        side === "buy" ? parseFloat(askPrice) : parseFloat(bidPrice);
    }

    // Pending order details
    if (pending) {
      base.trigger_price = parseFloat(atPrice);
      base.expiry = expiryEnabled ? expiry : null;
    }

    return base;
  }, [
    symbol,
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

  // Valid when side is chosen, SL/TP (if used) have >0 pips, and for pending orders an atPrice exists
  const isReadyToTrade =
    !!side &&
    (!pending || !!atPrice) &&
    (!useSL || slPips > 0) &&
    (!useTP || tpPips > 0);

  const handleTrade = async () => {
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
      const { status, data: order, message } = await res.json();
      if (status === "success") {
        setToastTitle("Trade Placed Successfully");
        setToastData("Your order has been sent.");
        setToastType("success");
        setToastOpen(true);
        playChime();
        onTradeSuccess?.(order);
      } else {
        alert("Trade failed: " + message);
      }
    } catch (err) {
      console.error("Network error:", err);
      setToastTitle("Network Error");
      setToastData("There was a problem placing your trade.");
      setToastType("error");
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#222733] rounded-lg text-white relative">
      {/* Tabs */}
      <div className="flex bg-[#1E2231] rounded-t-lg">
        {["Market execution", "Advanced trades"].map((label) => (
          <button
            key={label}
            onClick={() => setTab(label)}
            className={`flex-1 text-sm font-medium py-2 transition-colors ${
              tab === label
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Symbol header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#323848]">
        <span className="w-2/6 flex items-center gap-2 text-white text-sm font-medium truncate">
          {/* Flags Circle */}
          <span className="relative flex w-8 h-5">
            <img
              src={baseFlagObj?.flag}
              // alt={asset.symbol.slice(0, 3)}
              className="absolute left-0 w-5 h-5 rounded-full border border-gray-800"
            />

            <img
              src={quoteFlagObj?.flag}
              // alt={asset.symbol.slice(3, 6)}
              className="absolute right-0 w-5 h-5 rounded-full border border-gray-800"
            />
          </span>
          {symbol.slice(0, 3)}/{symbol.slice(3)}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-4">
        {/* Size & Metrics */}
        <div>
          {/* Label */}
          <label className="text-xs text-gray-400 mb-1 block">
            Select a trade size
          </label>

          {/* Box */}
          <div className="flex items-center bg-[#1A1F27] rounded-md border border-gray-700 px-2 py-1 mb-3 justify-between">
            {/* Input */}
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={tradeSize}
              onChange={(e) => setTradeSize(Math.max(0.01, +e.target.value))}
              className="flex-1 bg-transparent text-white text-sm outline-none px-1"
            />

            {/* Buttons (stacked vertically) */}
            {/* <div className="flex flex-col ml-2 border-l border-gray-700"> */}
            <button
              type="button"
              onClick={increase}
              className="w-6 h-5 flex items-center justify-center text-gray-300 me-1 hover:text-white"
            >
              <img
                src={UpIcon}
                alt="Increase"
                className="w-6 h-6 bg-gray-500 rounded-sm"
              />
            </button>
            <button
              type="button"
              onClick={decrease}
              className="w-6 h-5 flex items-center justify-center text-gray-300 ms-1 hover:text-white"
            >
              {/* Same icon rotated 180° */}
              <img
                src={UpIcon}
                alt="Decrease"
                className="w-6 h-6 transform rotate-180  bg-gray-500 rounded-sm"
              />
            </button>
            {/* </div> */}
          </div>
          <div className="text-xs text-gray-400 space-y-1 mb-4">
            <div className="flex justify-between">
              <span>{tradeSize.toFixed(2)} Lot:</span>
              <span className="text-blue-300 font-semibold">
                {lotSizeUnits.toLocaleString()} {symbol.slice(0, 3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span></span>
              <span>
                {lotValueUSD === "--"
                  ? "…"
                  : `($${Number(lotValueUSD).toLocaleString()})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Leverage:</span>
              <span className="text-white">1:400</span>
            </div>
            <div className="flex justify-between">
              <span>Pips Value:</span>
              <span className="text-white">${pipValue}</span>
            </div>
            <div className="flex justify-between">
              <span>Required Margin:</span>
              <span className="text-white">
                {requiredMargin === "--" ? "…" : `$${requiredMargin}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Spread:</span>
              <span className="text-white">{spread} Pips</span>
            </div>
          </div>

          {/* Buy/Sell */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-2 border border-red-500 rounded-lg ${
                side === "sell"
                  ? "bg-red-500/20 text-white"
                  : "text-red-400 hover:bg-red-500/10"
              }`}
            >
              <div className="text-sm font-bold">SELL</div>
              <div className="text-lg font-mono">
                {bidPrice != null ? bidPrice.toFixed(5) : "--"}
              </div>
            </button>
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-2 border border-green-500 rounded-lg ${
                side === "buy"
                  ? "bg-green-500/20 text-white"
                  : "text-green-400 hover:bg-green-500/10"
              } relative`}
            >
              <div className="text-sm font-bold">BUY</div>
              <div className="text-lg font-mono">
                {askPrice != null ? askPrice.toFixed(5) : "--"}
              </div>
            </button>
          </div>

          {/* Market execution button */}
          {tab === "Market execution" && (
            <button
              onClick={handleTrade}
              disabled={!isReadyToTrade || isSubmitting}
              className={`w-full py-2 rounded-lg font-semibold ${
                isReadyToTrade && !isSubmitting
                  ? "bg-blue-600"
                  : "bg-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {isSubmitting ? "Placing..." : "Trade"}
            </button>
          )}
        </div>

        {/* Advanced trades */}
        {tab === "Advanced trades" && (
          <div className="space-y-4">
            {/* Pending toggle */}
            <div className="flex items-center space-x-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={pending}
                  onChange={() => setPending((p) => !p)}
                  disabled={!side}
                />
                <div className="w-10 h-5 bg-gray-600 rounded-full peer-checked:bg-blue-500 transition" />
                <div className="absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full peer-checked:translate-x-5 transition" />
              </label>
              <span className={`text-sm ${!side ? "opacity-50" : ""}`}>
                Set pending order
              </span>
            </div>

            {/* At price & type & expiry (only if pending) */}
            {pending && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="text-xs text-gray-400">At price:</div>
                  <div className="flex items-center bg-[#1A1F27] rounded-md p-1">
                    <input
                      type="number"
                      step="0.00001"
                      value={atPrice}
                      onChange={(e) => setAtPrice(e.target.value)}
                      className="mx-2 w-full bg-transparent text-right outline-none text-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="text-xs text-gray-400">Type:</div>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full bg-[#1A1F27] rounded-md p-1 text-white outline-none text-sm"
                  >
                    {["Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      )
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={expiryEnabled}
                      onChange={() => setExpiryEnabled((e) => !e)}
                      className="form-tick h-4 w-4 text-blue-500 rounded border-gray-600"
                    />
                    <span className="text-xs text-gray-400">Expiry:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    disabled={!expiryEnabled}
                    className="w-full bg-[#1A1F27] rounded-md p-1 text-white outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* SL / TP blocks */}
            <table
              className="table table-dark align-middle mb-3"
              style={{ background: "#232733", borderRadius: 8 }}
            >
              <thead>
                <tr
                  className="text-secondary text-xs"
                  style={{ borderBottom: "1px solid #323848" }}
                >
                  <th style={{ width: "30%" }}></th>
                  <th className="text-center" style={{ width: "20%" }}>
                    Pips
                  </th>
                  <th className="text-center" style={{ width: "30%" }}>
                    Price
                  </th>
                  <th className="text-center" style={{ width: "20%" }}>
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Stop Loss",
                    enabled: useSL,
                    toggle: () => setUseSL((u) => !u),
                    pips: slPips,
                    onPipsChange: handleSlPipsChange,
                    price: slPrice,
                    onPriceChange: handleSlPriceChange,
                    color: "text-danger",
                    profit:
                      slPips && slPips > 0
                        ? `–$${Math.abs(
                            (slPips * PIP_VALUE_PER_LOT).toFixed(2)
                          )}`
                        : "--",
                  },
                  {
                    label: "Take Profit",
                    enabled: useTP,
                    toggle: () => setUseTP((u) => !u),
                    pips: tpPips,
                    onPipsChange: handleTpPipsChange,
                    price: tpPrice,
                    onPriceChange: handleTpPriceChange,
                    color: "text-success",
                    profit:
                      tpPips && tpPips > 0
                        ? `+$${Math.abs(
                            (tpPips * PIP_VALUE_PER_LOT).toFixed(2)
                          )}`
                        : "--",
                  },
                ].map(
                  (
                    {
                      label,
                      enabled,
                      toggle,
                      pips,
                      onPipsChange,
                      price,
                      onPriceChange,
                      color,
                      profit,
                    },
                    idx
                  ) => (
                    <tr key={label}>
                      <td>
                        <div className="form-check form-switch d-inline-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={label}
                            checked={enabled}
                            onChange={toggle}
                            disabled={!side}
                          />
                          <label
                            htmlFor={label}
                            className="form-check-label text-white text-xs mb-0 ms-2"
                            style={!side ? { opacity: 0.5 } : {}}
                          >
                            {label}
                          </label>
                        </div>
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={pips}
                          onChange={(e) => onPipsChange(+e.target.value)}
                          disabled={!enabled}
                          className="form-control form-control-sm bg-dark text-white text-center"
                          style={{
                            maxWidth: 56,
                            margin: "auto",
                            padding: "2px 2px",
                          }}
                          id={`pips-${label}`}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          step="0.00001"
                          value={price}
                          onChange={(e) => onPriceChange(+e.target.value)}
                          disabled={!enabled}
                          className="form-control form-control-sm bg-dark text-white text-center"
                          style={{
                            maxWidth: 90,
                            margin: "auto",
                            padding: "2px 2px",
                          }}
                          id={`price-${label}`}
                        />
                      </td>
                      <td className="text-center">
                        <span
                          className={"fw-bold " + color}
                          style={{ fontSize: 15 }}
                        >
                          {enabled ? profit : "--"}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {/* Place order */}
            <button
              onClick={handleTrade}
              disabled={!isReadyToTrade || isSubmitting}
              className={`w-full py-2 rounded-lg font-semibold ${
                isReadyToTrade && !isSubmitting
                  ? "bg-blue-600"
                  : "bg-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {isSubmitting ? "Placing..." : "Trade"}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {/* {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-center justify-center">
          <div className="bg-white text-black rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Trade Placed!</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded">
              {JSON.stringify(modalData, null, 2)}
            </pre>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )} */}
      {/* Top-right dismissable toast */}
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastTitle}
        description={toastData}
        type={toastType}
        duration={4000}
      />
    </div>
  );
}
