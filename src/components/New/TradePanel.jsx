// src/components/TradePanel.jsx
import React, { useState, useEffect, useMemo } from "react";
import { HiChevronUp, HiChevronDown } from "react-icons/hi";

const API_BASE_URL = "http://localhost/server/public/api";
const FOREXFEED_APP_ID = import.meta.env.VITE_FOREXFEED_APP_ID; // ← your APP ID

// Map first three letters of the symbol to a flag SVG
const getFlagUrl = (symbol) => {
  if (symbol.startsWith("EUR")) return "/flags/eur.svg";
  if (symbol.startsWith("USD")) return "/flags/usd.svg";
  if (symbol.startsWith("GBP")) return "/flags/gbp.svg";
  return "/flags/usd.svg";
};

// pip constants
const PIP_VALUE_PER_LOT = 0.1; // $ per pip for 1 standard lot
const PIP_FACTOR = 10000; // for 4-decimals pairs like EUR/USD
const ONE_PIP = 1 / PIP_FACTOR;

export default function TradePanel({
  symbol = "EURUSD",
  user,
  onTradeSuccess,
}) {
  const [tab, setTab] = useState("Market execution");
  const [tradeSize, setTradeSize] = useState(0.01);
  const [side, setSide] = useState(""); // "buy" or "sell"
  const [pending, setPending] = useState(false);
  const [atPrice, setAtPrice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // advanced‐order settings
  const [orderType, setOrderType] = useState("Buy Limit");
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiry, setExpiry] = useState(new Date().toISOString().slice(0, 16));

  // SL/TP state
  const [useSL, setUseSL] = useState(false);
  const [slPips, setSlPips] = useState(50);
  const [slPrice, setSlPrice] = useState(0);
  const [useTP, setUseTP] = useState(false);
  const [tpPips, setTpPips] = useState(50);
  const [tpPrice, setTpPrice] = useState(0);

  // dummy bid/ask
  const sellPrice = 1.17163;
  const buyPrice = 1.1717;

  // computed metrics
  const lotSizeUnits = useMemo(() => tradeSize * 100000, [tradeSize]);
  const pipValue = useMemo(
    () => (tradeSize * PIP_VALUE_PER_LOT).toFixed(2),
    [tradeSize]
  );
  const spread = useMemo(
    () => ((buyPrice - sellPrice) * PIP_FACTOR).toFixed(1),
    [buyPrice, sellPrice]
  );

  // Profit displays
  const slProfit = useMemo(() => {
    if (!useSL || !atPrice || !slPrice) return "--";
    const diff =
      side === "buy"
        ? parseFloat(atPrice) - slPrice
        : slPrice - parseFloat(atPrice);
    const profit = diff * PIP_FACTOR * PIP_VALUE_PER_LOT * tradeSize;
    return `${profit >= 0 ? "-" : ""}$${profit.toFixed(2)}`;
  }, [useSL, atPrice, slPrice, side, tradeSize]);

  const tpProfit = useMemo(() => {
    if (!useTP || !atPrice || !tpPrice) return "--";
    const diff =
      side === "buy"
        ? tpPrice - parseFloat(atPrice)
        : parseFloat(atPrice) - tpPrice;
    const profit = diff * PIP_FACTOR * PIP_VALUE_PER_LOT * tradeSize;
    return `${profit >= 0 ? "+" : ""}$${profit.toFixed(2)}`;
  }, [useTP, atPrice, tpPrice, side, tradeSize]);

  // margin & conversion
  const [requiredMargin, setRequiredMargin] = useState("--");
  const [lotValueUSD, setLotValueUSD] = useState("--");
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

  // default atPrice & initial SL/TP when pending is toggled on
  useEffect(() => {
    if (pending && side) {
      const entry = side === "buy" ? buyPrice : sellPrice;
      setAtPrice(entry.toFixed(5));

      // initial 50 pips => ±$5 or –$5
      const sl = side === "buy" ? entry - 50 * ONE_PIP : entry + 50 * ONE_PIP;
      const tp = side === "buy" ? entry + 50 * ONE_PIP : entry - 50 * ONE_PIP;

      setSlPips(50);
      setTpPips(50);
      setSlPrice(sl.toFixed(5));
      setTpPrice(tp.toFixed(5));
    }
  }, [pending, side, buyPrice, sellPrice]);

  // conversion helper
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
    throw new Error("Conversion data not found");
  }

  // handlers for two‐way SL
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

  // handlers for two‐way TP
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

  // build order payload
  const derivedOrderType = useMemo(() => {
    if (tab === "Market execution") return "market";
    const parts = orderType.split(" ");
    return parts[1].toLowerCase(); // "limit" or "stop"
  }, [tab, orderType]);
  // build payload for API
  const payload = useMemo(() => {
    const base = {
      symbol,
      side,
      order_type: derivedOrderType,
      volume: tradeSize,
      leverage: 400,
      stop_loss_price: useSL ? slPrice : null,
      take_profit_price: useTP ? tpPrice : null,
    };
    if (derivedOrderType !== "market") {
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
    atPrice,
    expiry,
    expiryEnabled,
  ]);

  // send to API
  const handleTrade = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      const { status, data: order, message } = await res.json();
      if (status === "success") {
        setModalData(order);
        setShowModal(true);
        onTradeSuccess?.(order);
      } else {
        alert("Trade failed: " + message);
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error placing trade");
    }
  };
  const isMarketReady = !!side;
  const isPendingReady =
    pending &&
    !!side &&
    !!atPrice &&
    (!useSL || slPips > 0) &&
    (!useTP || tpPips > 0);
  const canPlaceAdvanced = pending || useSL || useTP;
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
        <img
          src={getFlagUrl(symbol)}
          alt=""
          className="w-6 h-6 rounded-full ring-1 ring-gray-600"
        />
        <h2 className="text-lg font-bold">
          {symbol.slice(0, 3)}/{symbol.slice(3)}
        </h2>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-4">
        {/* Size & Metrics */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Select a trade size
          </label>
          <div className="flex items-center bg-[#1A1F27] rounded-md p-1 mb-3">
            <input
              type="number"
              step="0.01"
              value={tradeSize}
              onChange={(e) => setTradeSize(Math.max(0.01, +e.target.value))}
              className="mx-2 w-16 bg-transparent text-center outline-none"
            />
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
              <div className="text-lg font-mono">{sellPrice.toFixed(5)}</div>
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
              <div className="text-lg font-mono">{buyPrice.toFixed(5)}</div>
              <div
                className="absolute top-0 right-0 w-0 h-0
                              border-t-[12px] border-l-[12px]
                              border-t-transparent border-l-white"
              />
            </button>
          </div>

          {/* Market button */}
          {tab === "Market execution" && (
            <button
              onClick={handleTrade}
              disabled={!isMarketReady || isSubmitting}
              className={`w-full py-2 rounded-lg font-semibold ${
                isMarketReady && !isSubmitting
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
                <div
                  className="absolute left-0.5 top-0.5 bg-white w-4 h-4
                                rounded-full peer-checked:translate-x-5 transition"
                />
              </label>
              <span className={`text-sm ${!side ? "opacity-50" : ""}`}>
                Set pending order
              </span>
            </div>

            {pending && (
              <div className="space-y-3">
                {/* At price */}
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

                {/* Type */}
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

                {/* Expiry */}
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
            {/* SL/TP */}
            <div className="grid grid-cols-1 gap-4 pt-2 border-t border-[#323848]">
              {[
                {
                  label: "Stop Loss",
                  enabled: useSL,
                  toggle: () => setUseSL((u) => !u),
                  pips: slPips,
                  onPipsChange: handleSlPipsChange,
                  price: slPrice,
                  onPriceChange: handleSlPriceChange,
                  profit: slProfit,
                },
                {
                  label: "Take Profit",
                  enabled: useTP,
                  toggle: () => setUseTP((u) => !u),
                  pips: tpPips,
                  onPipsChange: handleTpPipsChange,
                  price: tpPrice,
                  onPriceChange: handleTpPriceChange,
                  profit: tpProfit,
                },
              ].map(
                ({
                  label,
                  enabled,
                  toggle,
                  pips,
                  onPipsChange,
                  price,
                  onPriceChange,
                  profit,
                }) => (
                  <div key={label} className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={toggle}
                        disabled={!side}
                        className="form-tick h-4 w-4 text-blue-500 rounded border-gray-600"
                      />
                      <span className={`text-sm ${!side ? "opacity-50" : ""}`}>
                        {label}
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      {/* Pips */}
                      <div className="flex flex-col items-center bg-[#1A1F27] rounded-md p-1">
                        <span className="text-[10px] text-gray-400">Pips</span>
                        <div className="flex items-center mt-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={pips}
                            onChange={(e) => onPipsChange(+e.target.value)}
                            disabled={!enabled}
                            className="mx-1 w-8 bg-transparent text-center outline-none text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex flex-col items-center bg-[#1A1F27] rounded-md p-1">
                        <span className="text-[10px] text-gray-400">Price</span>
                        <div className="flex items-center mt-1">
                          <input
                            type="number"
                            step="0.00001"
                            value={price}
                            onChange={(e) => onPriceChange(+e.target.value)}
                            disabled={!enabled}
                            className="mx-1 w-12 bg-transparent text-center outline-none text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Profit */}
                      <div className="flex flex-col items-center bg-[#1A1F27] rounded-md p-2">
                        <span className="text-[10px] text-gray-400">
                          Profit
                        </span>
                        <span className="mt-1 text-sm text-white">
                          {enabled ? profit : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Place order */}
            <button
              onClick={handleTrade}
              disabled={!isMarketReady || isSubmitting}
              className={`w-full py-2 rounded-lg font-semibold ${
                isMarketReady && !isSubmitting
                  ? "bg-blue-600"
                  : "bg-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {isSubmitting ? "Placing..." : "Trade"}
            </button>
          </div>
        )}
      </div>
      {showModal && (
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
      )}
    </div>
  );
}
