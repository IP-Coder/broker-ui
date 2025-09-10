// src/components/MobileDashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socketClient";
import { Toast } from "../noti/Toast";
import { useNotificationSound } from "../noti/useNotificationSound";
import Footer from "./Footer";

// Import your existing modals
import PendingOrdersModal from "./PendingOrdersModal";
import OpenOrdersModal from "./OpenOrdersModal";
import TradeHistoryModal from "./TradeHistoryModal";
import Header from "./Header";

// Trading constants
const PIP_VALUE_PER_LOT = 0.1;
const PIP_FACTOR = 10000;
const ONE_PIP = 1 / PIP_FACTOR;
const FOREXFEED_APP_ID = import.meta.env.VITE_FOREXFEED_APP_ID;

export default function MobileDashboard() {
  const navigate = useNavigate();
  const playChime = useNotificationSound();
  const widgetRef = useRef(null);

  // Core states
  const [selectedSymbol, setSelectedSymbol] = useState("NZDUSD");
  const [user, setUser] = useState(null);
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);

  // Price states
  const [bidPrice, setBidPrice] = useState(0.59065);
  const [askPrice, setAskPrice] = useState(0.59082);
  const [priceChange, setPriceChange] = useState(0);
  const [prevPrice, setPrevPrice] = useState(0.59065);

  // Trade states
  const [tradeSize, setTradeSize] = useState(0.01);
  const [interval, setInterval] = useState("5");
  const [showTimePopup, setShowTimePopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showPending, setShowPending] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Toast states
  const [toastOpen, setToastOpen] = useState(false);
  const [toastData, setToastData] = useState("");
  const [toastType, setToastType] = useState("");
  const [toastTitle, setToastTitle] = useState("");

  // Calculated values
  const [lotValueUSD, setLotValueUSD] = useState("1.48");
  const [requiredMargin, setRequiredMargin] = useState("1.48");
  const [freeMargin, setFreeMargin] = useState("0.00");

  // Available symbols
  const symbols = [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "AUDUSD",
    "USDCAD",
    "NZDUSD",
    "EURGBP",
    "EURJPY",
    "GBPJPY",
  ];

  // Timeframe options
  const timeframes = [
    { label: "1 Minute", value: "1" },
    { label: "5 Minutes", value: "5" },
    { label: "15 Minutes", value: "15" },
    { label: "30 Minutes", value: "30" },
    { label: "1 Hour", value: "60" },
    { label: "4 Hours", value: "240" },
    { label: "1 Day", value: "D" },
  ];

  // Initialize user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setUser({ token });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Subscribe to live ticks
  useEffect(() => {
    const handleTick = (data) => {
      const incoming = data.code?.replace("OANDA:", "");
      if (incoming !== selectedSymbol) return;

      if (data.bid && data.ask) {
        const newBid = parseFloat(data.bid);
        const newAsk = parseFloat(data.ask);

        setPrevPrice(bidPrice);
        setBidPrice(newBid);
        setAskPrice(newAsk);

        // Calculate price change
        if (prevPrice > 0) {
          setPriceChange(newBid - prevPrice);
        }
      }
    };

    socket.on("tick", handleTick);
    return () => socket.off("tick", handleTick);
  }, [selectedSymbol, bidPrice, prevPrice]);

  // Initialize TradingView Chart
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
          widgetRef.current.remove();
        } catch (e) {
          console.warn("Chart cleanup error:", e);
        }
      }

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: `OANDA:${selectedSymbol}`,
        interval: interval,
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

  // Calculate margins and pip values
  useEffect(() => {
    const calculateValues = async () => {
      try {
        const units = (tradeSize * 100000).toFixed(2);
        const base = selectedSymbol.slice(0, 3);
        const usd = await convertCurrency(units, base);
        const leverage = 400;

        setLotValueUSD(usd.toFixed(2));
        setRequiredMargin((usd / leverage).toFixed(2));
      } catch (error) {
        setLotValueUSD("err");
        setRequiredMargin("err");
      }
    };

    calculateValues();
  }, [tradeSize, selectedSymbol]);

  // Currency conversion function
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

  // Calculated values
  const spread = useMemo(() => {
    if (bidPrice && askPrice) {
      return ((askPrice - bidPrice) * PIP_FACTOR).toFixed(1);
    }
    return "0.0";
  }, [bidPrice, askPrice]);

  const pipValue = useMemo(() => {
    return (tradeSize * PIP_VALUE_PER_LOT).toFixed(2);
  }, [tradeSize]);

  const priceChangePercent = useMemo(() => {
    if (prevPrice > 0 && priceChange !== 0) {
      return ((priceChange / prevPrice) * 100).toFixed(2);
    }
    return "0.00";
  }, [priceChange, prevPrice]);

  // Price class determination
  const priceClass =
    priceChange > 0 ? "positive" : priceChange < 0 ? "negative" : "neutral";

  // Handle trade execution
  const handleTrade = async (side) => {
    if (!user?.token) {
      navigate("/login");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      symbol: selectedSymbol,
      side: side,
      order_type: "market",
      volume: tradeSize,
      leverage: 400,
      open_price: side === "buy" ? askPrice : bidPrice,
    };

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
        setToastData(
          `${side.toUpperCase()} ${tradeSize} lots ${selectedSymbol}`
        );
        setToastType("success");
        setToastOpen(true);
        playChime();
      } else {
        setToastTitle("Trade Failed");
        setToastData(message || "Unknown error occurred");
        setToastType("error");
        setToastOpen(true);
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

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="mobile-trading-dashboard">
      <style jsx>{`
        .mobile-trading-dashboard {
          font-family: "Segoe UI", Roboto, Arial, sans-serif;
          background-color: #1e1f2a;
          color: white;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          line-height: 1.5;
          overflow-x: hidden;
        }

        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: #2d2f3e;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .info-icon {
          font-size: 18px;
          cursor: pointer;
        }

        .auth-buttons {
          display: flex;
          gap: 8px;
        }

        .top-bar button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .login {
          background-color: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .login:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .signup {
          background-color: #00e092;
          color: black;
        }

        .signup:hover {
          background-color: #00c982;
        }

        .market-status {
          background-color: #3c3f50;
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
          transition: transform 0.2s ease;
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
          background-color: #14151f;
          border: 1px solid #333;
          border-radius: 8px;
        }

        .trade-info {
          display: flex;
          justify-content: space-around;
          padding: 12px 0;
          font-size: 13px;
          background-color: #2a2c3a;
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
          background-color: #1f202c;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          flex-wrap: wrap;
          gap: 10px;
        }

        .control-item {
          background-color: #2d2f3e;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 60px;
          justify-content: center;
          white-space: nowrap;
          border: none;
          color: white;
        }

        .control-item:hover {
          background-color: #3d3f4e;
        }

        .time-dropdown {
          position: relative;
        }

        .time-box {
          background-color: #2d2f3e;
          padding: 7px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background-color 0.2s ease;
          white-space: nowrap;
          border: none;
          color: white;
        }

        .time-box:hover {
          background-color: #3d3f4e;
        }

        .time-popup {
          position: absolute;
          top: 50px;
          left: 0;
          background-color: #1e1f2a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 10px;
          z-index: 100;
          width: 180px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .time-option {
          flex: 1 1 40%;
          text-align: center;
          background-color: #2d2f3e;
          padding: 10px;
          border-radius: 6px;
          cursor: pointer;
          color: white;
          font-size: 14px;
          border: 1px solid #444;
          transition: all 0.2s ease;
        }

        .time-option:hover {
          background-color: #3d3f4f;
        }

        .time-option.active {
          background-color: white;
          color: black;
          font-weight: 600;
        }

        .hidden {
          display: none;
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
          background-color: #14151f;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 12px;
          border-top: 1px solid #333;
          gap: 12px;
        }

        .buy,
        .sell {
          flex: 1;
          padding: 16px 12px;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .buy {
          background-color: #00e092;
          color: #000;
        }

        .buy:hover:not(:disabled) {
          background-color: #00c982;
        }

        .sell {
          background-color: #e04d4d;
        }

        .sell:hover:not(:disabled) {
          background-color: #d04242;
        }

        .buy:disabled,
        .sell:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .price-value {
          font-size: 16px;
          margin-top: 4px;
          font-weight: 600;
        }

        .symbol-selector {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .symbol-list {
          background: #1e1f2a;
          border-radius: 12px;
          padding: 20px;
          max-width: 300px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .symbol-list h3 {
          margin: 0 0 15px 0;
          text-align: center;
        }

        .symbol-item {
          display: block;
          width: 100%;
          background: #2d2f3e;
          border: none;
          color: white;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .symbol-item:hover {
          background: #3d3f4e;
        }

        .symbol-item.active {
          background: #00e092;
          color: black;
        }

        .close-btn {
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        /* Responsive */
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
          .control-item {
            padding: 8px 10px;
            font-size: 12px;
          }
          .buy,
          .sell {
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
          .buy,
          .sell {
            font-size: 15px;
            padding: 12px 6px;
          }
        }
      `}</style>

      {/* Top Bar */}
      <div className="">
        {/* <div className="logo-section" onClick={() => navigate("/dashboard")}>
          RoyalsFx
          <span className="info-icon">ℹ️</span>
        </div>
        <div className="auth-buttons">
          <button className="login" onClick={() => setShowOpen(true)}>
            Trades
          </button>
          <button className="signup" onClick={() => navigate("/deposit")}>
            Deposit
          </button>
        </div> */}
        <Header />
      </div>

      {/* Market Status */}
      <div className="market-status">
        Market is Open - Live Trading Available
      </div>

      {/* Chart Header */}
      <div className="chart-header" onClick={() => setShowSymbolSelector(true)}>
        <h2>
          {selectedSymbol}
          <span className="dropdown-arrow">▼</span>
        </h2>
        <div className={`price ${priceClass}`}>
          {bidPrice?.toFixed(5)}{" "}
          <span>
            ({priceChange >= 0 ? "+" : ""}
            {priceChangePercent}%)
          </span>
        </div>
      </div>

      {/* Chart Container */}
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
                <div
                  key={tf.value}
                  className={`time-option ${
                    interval === tf.value ? "active" : ""
                  }`}
                  onClick={() => {
                    setInterval(tf.value);
                    setShowTimePopup(false);
                  }}
                >
                  {tf.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="control-item">
          <span>👤</span> {tradeSize} Lot
        </button>

        <button className="control-item" onClick={() => setShowPending(true)}>
          <span>⏱️</span> Pending
        </button>

        <button className="control-item" onClick={() => setShowHistory(true)}>
          <span>📊</span> History
        </button>
      </div>

      {/* Spread */}
      <div className="spread">{spread} PIPS</div>

      {/* Bottom Trading Bar */}
      <div className="bottom-bar">
        <button
          className="sell"
          onClick={() => handleTrade("sell")}
          disabled={isSubmitting}
        >
          SELL
          <div className="price-value">{bidPrice?.toFixed(5)}</div>
        </button>
        <button
          className="buy"
          onClick={() => handleTrade("buy")}
          disabled={isSubmitting}
        >
          BUY
          <div className="price-value">{askPrice?.toFixed(5)}</div>
        </button>
      </div>

      {/* Symbol Selector Modal */}
      {showSymbolSelector && (
        <div className="symbol-selector">
          <div className="symbol-list">
            <button
              className="close-btn"
              onClick={() => setShowSymbolSelector(false)}
            >
              ×
            </button>
            <h3>Select Trading Pair</h3>
            {symbols.map((symbol) => (
              <button
                key={symbol}
                className={`symbol-item ${
                  selectedSymbol === symbol ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedSymbol(symbol);
                  setShowSymbolSelector(false);
                }}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
