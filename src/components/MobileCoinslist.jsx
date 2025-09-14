// src/components/MobileCoinslist.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socketClient";
import Header from "./Header";
import Footer from "./Footer";
import { flagsData } from "./flagsdata";

// --- helpers (kept in-sync with Sidebar) ---
const getCategory = (symbolObj) => {
  if (!symbolObj) return "Currencies";
  const s = (symbolObj.displaySymbol || symbolObj.symbol || "").toUpperCase();
  if (/BTC|ETH|USDT|XRP|ADA|DOGE|SOL|LTC|BCH|XMR/.test(s))
    return "Cryptocurrencies";
  if (/XAU|XAG|NATGAS|XCU|BCO|BRENT|WTI/.test(s)) return "Commodities";
  return "Currencies";
};

// 🕒 U.S. (New York) weekend helper
const isUSWeekend = () => {
  try {
    const nyString = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    const nyDate = new Date(nyString);
    const day = nyDate.getDay(); // 0 = Sun, 6 = Sat
    return day === 0 || day === 6;
  } catch {
    const d = new Date().getDay();
    return d === 0 || d === 6;
  }
};

function formatSixDigits(raw) {
  if (raw == null || raw === "") return "--";
  const n = Number(raw);
  if (Number.isNaN(n)) return "--";
  const neg = n < 0;
  let s = Math.abs(n).toString();
  if (/e/i.test(s)) s = Math.abs(n).toFixed(20);
  let [intPart, fracPart = ""] = s.split(".");
  if (intPart.length >= 6) return (neg ? "-" : "") + intPart.slice(0, 6);
  const need = 6 - intPart.length;
  const frac = (fracPart || "").padEnd(need, "0").slice(0, need);
  return (neg ? "-" : "") + intPart + "." + frac;
}

function formatEightDigits(raw) {
  if (raw == null || raw === "") return "--";
  const n = Number(raw);
  if (Number.isNaN(n)) return "--";
  const neg = n < 0;
  let s = Math.abs(n).toString();
  if (/e/i.test(s)) s = Math.abs(n).toFixed(20);
  let [intPart, fracPart = ""] = s.split(".");
  if (intPart.length >= 8) return (neg ? "-" : "") + intPart.slice(0, 8);
  const need = 8 - intPart.length;
  const frac = (fracPart || "").padEnd(need, "0").slice(0, need);
  return (neg ? "-" : "") + intPart + "." + frac;
}

export default function MobileCoinslist() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [selectedTab, setSelectedTab] = useState("Currencies");
  const [searchTerm, setSearchTerm] = useState("");
  const [favourites, setFavourites] = useState([]);

  const [symbols, setSymbols] = useState([]); // live list from DB + socket
  const flatFlags = Array.isArray(flagsData[0]) ? flagsData[0] : flagsData;

  // ⏰ Weekend state + dismissable alert
  const [isWeekend, setIsWeekend] = useState(isUSWeekend());
  const [showWeekendAlert, setShowWeekendAlert] = useState(false);

  // keep weekend status fresh (in case app stays open over midnight)
  useEffect(() => {
    const id = setInterval(() => setIsWeekend(isUSWeekend()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 1) Auth bootstrap
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setUser({ token });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // 2) Fetch symbols once (same shape as Sidebar)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/symbols`);
        const { symbols: raw = [] } = await res.json();

        const mapped = raw.map((s) => {
          // Drop provider prefix (e.g., OANDA:, BINANCE:)
          const rawSymbol = s.symbol.includes(":")
            ? s.symbol.split(":")[1]
            : s.symbol;
          const baseCode = rawSymbol.slice(0, 3);
          const quoteCode = rawSymbol.slice(3, 6);
          const baseFlagObj = flatFlags.find((f) => f.code === baseCode);
          const quoteFlagObj = flatFlags.find((f) => f.code === quoteCode);
          return {
            ...s,
            displaySymbol: rawSymbol, // used for UI + categorization
            safeSymbol: rawSymbol.replace(":", "_"),
            baseFlag: baseFlagObj?.flag || null,
            quoteFlag: quoteFlagObj?.flag || null,
            price: s.last_price ?? null,
            changePercent: null,
            direction: "same",
            initialPrice: null,
            high: null,
            low: null,
            ask: null,
            bid: null,
            askSize: null,
            bidSize: null,
          };
        });

        setSymbols(mapped);
      } catch (err) {
        console.error("Failed to load symbols", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Subscribe to WebSocket ticks (same normalization as Sidebar)
  useEffect(() => {
    const onTick = (data) => {
      const incoming = (data.code || "")
        .replace(/(OANDA:|BINANCE:)/g, "")
        .replace(":", "_");
      setSymbols((prev) =>
        prev.map((a) => {
          if (a.safeSymbol !== incoming) return a;
          let updated = { ...a };
          if (data.last_price != null) {
            const mid = parseFloat(data.last_price);
            const init = a.initialPrice ?? mid;
            const dir = mid > init ? "up" : mid < init ? "down" : "same";
            const pct = data.change ?? a.changePercent;
            updated = {
              ...updated,
              price: mid,
              initialPrice: init,
              direction: dir,
              changePercent: pct,
              high: a.high != null ? Math.max(a.high, mid) : mid,
              low: a.low != null ? Math.min(a.low, mid) : mid,
            };
          }
          if (data.ask != null) updated.ask = data.ask;
          if (data.bid != null) updated.bid = data.bid;
          if (data.ask_size != null || data.askSize != null)
            updated.askSize = data.ask_size ?? data.askSize;
          if (data.bid_size != null || data.bidSize != null)
            updated.bidSize = data.bid_size ?? data.bidSize;
          return updated;
        })
      );
    };
    socket.on("tick", onTick);
    return () => socket.off("tick", onTick);
  }, []);

  // 4) Load favourites (API if authed; fallback to localStorage)
  useEffect(() => {
    (async () => {
      try {
        if (user?.token) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/symbols`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          const { favorites = [] } = await res.json();
          setFavourites(favorites.map((f) => f.symbol));
        } else {
          const saved = localStorage.getItem("favourites");
          if (saved) setFavourites(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Failed to load favorites", err);
      }
    })();
  }, [user]);

  // 5) Toggle favourite (blocked only for Currencies & Commodities on U.S. weekends)
  const toggleFavourite = async (symbol) => {
    const asset = symbols.find(
      (s) => s.symbol === symbol || s.displaySymbol === symbol
    );
    const cat = asset ? getCategory(asset) : null;
    const blocked =
      isWeekend && (cat === "Currencies" || cat === "Commodities");
    if (blocked) return; // do nothing on weekends for blocked categories

    const isFav = favourites.includes(symbol);
    const optimistic = isFav
      ? favourites.filter((f) => f !== symbol)
      : [...favourites, symbol];
    setFavourites(optimistic);

    if (user?.token) {
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL}/favorites${
            isFav ? `/${symbol}` : ""
          }`,
          {
            method: isFav ? "DELETE" : "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: isFav ? undefined : JSON.stringify({ symbol }),
          }
        );
      } catch (e) {
        // revert on failure
        setFavourites(favourites);
      }
    } else {
      localStorage.setItem("favourites", JSON.stringify(optimistic));
    }
  };

  // 6) Derived lists
  const categorized = {
    Favourites: symbols.filter((s) => favourites.includes(s.symbol)),
    Currencies: symbols.filter((s) => getCategory(s) === "Currencies"),
    Commodities: symbols.filter((s) => getCategory(s) === "Commodities"),
    Cryptocurrencies: symbols.filter(
      (s) => getCategory(s) === "Cryptocurrencies"
    ),
  };

  const tabs = ["Favourites", "Currencies", "Commodities", "Cryptocurrencies"];

  const filteredAssets = (categorized[selectedTab] || []).filter((a) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.title || a.displaySymbol || "").toLowerCase().includes(q) ||
      (a.base_title || "").toLowerCase().includes(q) ||
      (a.quote_title || "").toLowerCase().includes(q) ||
      (a.symbol || "").toLowerCase().includes(q)
    );
  });

  // 7) Weekend alert visibility (only for Currencies & Commodities tabs)
  useEffect(() => {
    const isBlockedTab =
      selectedTab === "Currencies" || selectedTab === "Commodities";
    if (isWeekend && isBlockedTab) {
      const key = "dismissWeekendAlertMobile";
      const dismissed = sessionStorage.getItem(key) === "1";
      setShowWeekendAlert(!dismissed);
    } else {
      setShowWeekendAlert(false);
    }
  }, [isWeekend, selectedTab]);

  const dismissWeekendAlert = () => {
    sessionStorage.setItem("dismissWeekendAlertMobile", "1");
    setShowWeekendAlert(false);
  };

  const handleCoinClick = (symbol, asset) => {
    const cat = getCategory(asset);
    const rowDisabled =
      isWeekend && (cat === "Currencies" || cat === "Commodities");
    if (rowDisabled) return; // block navigation for blocked categories on weekends
    navigate(`/dashboard?symbol=${encodeURIComponent(symbol)}&mobile=true`);
  };

  return (
    <div className="mobile-coins-list">
      <style>{`
        .mobile-coins-list { background-color: #14151f; color: white; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding-bottom: 64px; }
        .search-container { padding: 16px; background-color: #1e1f2a; border-bottom: 1px solid #333; }
        .search-input { width: 100%; padding: 12px 16px; background-color: #2d2f3e; border: 1px solid #444; border-radius: 8px; color: white; font-size: 16px; outline: none; }
        .search-input::placeholder { color: #999; }
        .tabs-container { display: flex; background-color: #1e1f2a; border-bottom: 1px solid #333; overflow-x: auto; padding: 0 16px; gap: 8px; }
        .tab { padding: 14px 16px; white-space: nowrap; color: #999; font-size: 14px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; border-radius: 4px 4px 0 0; }
        .tab.active { color: white; border-bottom-color: #00e092; }
        .alert { display: flex; gap: 8px; align-items: flex-start; margin: 12px 16px 0; padding: 10px 12px; border-radius: 8px; border: 1px solid #facc15; background: #2a260f; color: #fde68a; font-size: 13px; }
        .assets-header { display: flex; padding: 12px 16px; background-color: #1e1f2a; border-bottom: 1px solid #333; font-size: 12px; color: #999; font-weight: 600; }
        .header-name { flex: 1; }
        .header-price, .header-change { width: 90px; text-align: right; }
        .assets-list { flex: 1; }
        .asset-item { display: flex; align-items: center; padding: 14px 16px; border-bottom: 1px solid #2d2f3e; cursor: pointer; transition: background-color 0.2s ease; }
        .asset-item:hover { background-color: #1e1f2a; }
        .asset-item.disabled { opacity: 0.5; cursor: not-allowed; }
        .favourite-btn { background: none; border: none; color: #999; font-size: 16px; cursor: pointer; margin-right: 12px; padding: 4px; }
        .favourite-btn.active { color: #ffd700; }
        .favourite-btn.disabled { cursor: not-allowed; opacity: 0.6; }
        .asset-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .asset-symbol { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .flags { position: relative; width: 32px; height: 18px; }
        .flag { position: absolute; width: 18px; height: 18px; border-radius: 50%; border: 1px solid #222; object-fit: cover; }
        .flag.left { left: 0; }
        .flag.right { right: 0; }
        .asset-name { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asset-price { width: 90px; text-align: right; font-size: 16px; font-weight: 700; }
        .asset-change { width: 90px; text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
        .change-value { font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
        .change-positive { color: #00e092; background-color: rgba(0, 224, 146, 0.1); }
        .change-negative { color: #e04d4d; background-color: rgba(224, 77, 77, 0.1); }
        .no-assets { text-align: center; padding: 40px 20px; color: #999; }
        .bottom-navigation { position: fixed; bottom: 0; left: 0; right: 0; background-color: #14151f; border-top: 1px solid #333; display: flex; justify-content: space-around; padding: 10px 0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; color: #999; text-decoration: none; font-size: 10px; cursor: pointer; }
        .nav-item.active { color: #00e092; }
        .nav-icon { font-size: 20px; margin-bottom: 4px; }
      `}</style>

      <Header />

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search assets"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 🔔 Weekend Closed Alert (U.S. time) for Currencies & Commodities */}
      {showWeekendAlert && (
        <div role="alert" aria-live="polite" className="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-5h2v5z" />
          </svg>
          <div className="flex-1">
            <strong className="font-semibold">Market Closed</strong>: Currencies
            and commodities are not tradable on Saturdays and Sundays (U.S.
            time).
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem("dismissWeekendAlertMobile", "1");
              setShowWeekendAlert(false);
            }}
            aria-label="Dismiss alert"
            style={{
              background: "none",
              border: "none",
              color: "#fde68a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab}
            className={`tab ${selectedTab === tab ? "active" : ""}`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="assets-header">
        <div className="header-name">Asset Name</div>
        <div className="header-price">Price</div>
        <div className="header-change">Change</div>
      </div>

      <div className="assets-list">
        {filteredAssets.length === 0 ? (
          <div className="no-assets">No assets found</div>
        ) : (
          filteredAssets.map((asset) => {
            const isFav = favourites.includes(asset.symbol);
            const pct = Number(asset.changePercent ?? 0);
            const changeClass =
              pct >= 0 ? "change-positive" : "change-negative";
            const sign = pct > 0 ? "+" : "";
            const cat = getCategory(asset);
            const rowDisabled =
              isWeekend && (cat === "Currencies" || cat === "Commodities");

            return (
              <div
                key={asset.symbol}
                className={`asset-item ${rowDisabled ? "disabled" : ""}`}
                onClick={() => handleCoinClick(asset.symbol, asset)}
                aria-disabled={rowDisabled}
                title={
                  rowDisabled
                    ? "Market closed (U.S. weekend) — selection disabled for this category"
                    : undefined
                }
              >
                <button
                  className={`favourite-btn ${isFav ? "active" : ""} ${
                    rowDisabled ? "disabled" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (rowDisabled) return;
                    toggleFavourite(asset.symbol);
                  }}
                  title={
                    rowDisabled
                      ? "Market closed (U.S. weekend) — action disabled for this category"
                      : isFav
                      ? "Unfavourite"
                      : "Favourite"
                  }
                  aria-disabled={rowDisabled}
                >
                  {isFav ? "★" : "☆"}
                </button>

                <div className="asset-info">
                  <div className="asset-symbol">
                    <span className="flags" aria-hidden>
                      {asset.baseFlag && (
                        <img
                          className="flag left"
                          src={asset.baseFlag}
                          alt={asset.displaySymbol?.slice(0, 3) || ""}
                        />
                      )}
                      {asset.quoteFlag && (
                        <img
                          className="flag right"
                          src={asset.quoteFlag}
                          alt={asset.displaySymbol?.slice(3, 6) || ""}
                        />
                      )}
                    </span>
                    {asset.displaySymbol || asset.symbol}
                  </div>
                  <div className="asset-name">
                    {asset.title ||
                      `${asset.base_title || ""} / ${asset.quote_title || ""}`}
                  </div>
                </div>

                <div className="asset-price">
                  {formatEightDigits(asset.price)}
                </div>

                <div className="asset-change">
                  <div className={`change-value ${changeClass}`}>{`${sign}${
                    pct?.toFixed(2) || "0.00"
                  }%`}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom navigation (single instance) */}
      <div className="bottom-navigation">
        <div className="nav-item active">
          <div className="nav-icon">≡</div>
          <div>Markets</div>
        </div>
        <div className="nav-item">
          <div className="nav-icon">↗</div>
          <div>My Trade</div>
        </div>
        <div className="nav-item" onClick={() => navigate("/wallet")}>
          <div className="nav-icon">⊞</div>
          <div>Wallet</div>
        </div>
      </div>

      {/* If you're actually using Footer elsewhere, keep it; otherwise remove */}
      {/* <Footer /> */}
    </div>
  );
}
