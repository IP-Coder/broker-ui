import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socketClient"; // ✅ Updated to use Socket.IO
import { flagsData } from "./flagsdata"; // ✅ country code to flag mapping
// Helper for asset categories
const getCategory = (symbolObj) => {
  if (!symbolObj) return "Currencies";
  const symbol = symbolObj.symbol || symbolObj.SYMBOL;
  if (/BTC|ETH|USDT|XRP|ADA|DOGE|SOL|LTC|BCH|XMR/i.test(symbol))
    return "Cryptocurrencies";
  if (/XAU|XAG|OIL|GOLD|WTI|BRENT/i.test(symbol)) return "Commodities";
  return "Currencies";
};

export default function Sidebar({ selectedSymbol, onSelectSymbol, user }) {
  const flatFlags = Array.isArray(flagsData[0]) ? flagsData[0] : flagsData;
  const [symbols, setSymbols] = useState([]);
  const [tab, setTab] = useState("Currencies");
  const [favourites, setFavourites] = useState([]);
  const [search, setSearch] = useState("");
  const chipRowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 1️⃣ Fetch symbols once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/symbols`);
        const { symbols: raw = [] } = await res.json();
        const mapped = raw.map((s) => {
          const baseCode = s.symbol.slice(0, 3);
          const quoteCode = s.symbol.slice(3, 6);

          const baseFlagObj = flatFlags.find((f) => f.code === baseCode);
          const quoteFlagObj = flatFlags.find((f) => f.code === quoteCode);

          return {
            ...s,
            safeSymbol: s.symbol.replace(":", "_"),
            baseFlag: baseFlagObj?.flag || null,
            quoteFlag: quoteFlagObj?.flag || null,
            price: null,
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
        console.log("Symbols loaded:", mapped);
      } catch (err) {
        console.error("Failed to load symbols", err);
      }
    })();
  }, []);

  // 2️⃣ Subscribe to WebSocket
  useEffect(() => {
    socket.on("tick", (data) => {
      const incoming = data.code.replace("OANDA:", "");

      setSymbols((prev) =>
        prev.map((a) => {
          if (a.safeSymbol !== incoming) return a;

          let updated = { ...a };

          if (data.last_price != null) {
            const mid = parseFloat(data.last_price);
            const init = a.initialPrice ?? mid;
            const dir = mid > init ? "up" : mid < init ? "down" : "same";
            const pct = data.change;

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
    });

    return () => {
      socket.off("tick");
    };
  }, []);

  // 3️⃣ Load user favourites
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/symbols`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const { favorites = [] } = await res.json();
        setFavourites(favorites.map((f) => f.symbol));
      } catch (err) {
        console.error("Failed to load favorites", err);
      }
    })();
  }, [user]);

  // 4️⃣ Toggle favourite
  const toggleFavourite = async (symbol) => {
    if (!user) return;
    const isFav = favourites.includes(symbol);
    const updated = isFav
      ? favourites.filter((f) => f !== symbol)
      : [...favourites, symbol];
    setFavourites(updated);
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/favorites${isFav ? `/${symbol}` : ""}`,
        {
          method: isFav ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: isFav ? undefined : JSON.stringify({ symbol }),
        }
      );
    } catch {
      setFavourites(favourites);
    }
  };

  // 5️⃣ Filter & categorize
  const categorized = {
    Favourites: symbols.filter((s) => favourites.includes(s.symbol)),
    Currencies: symbols.filter((s) => getCategory(s) === "Currencies"),
    Commodities: symbols.filter((s) => getCategory(s) === "Commodities"),
    Cryptocurrencies: symbols.filter(
      (s) => getCategory(s) === "Cryptocurrencies"
    ),
  };
  const filtered = (categorized[tab] || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.base_title || "").toLowerCase().includes(q) ||
      (s.quote_title || "").toLowerCase().includes(q)
    );
  });

  // 6️⃣ Scroll logic
  const scrollChips = (dir) => {
    chipRowRef.current?.scrollBy({
      left: dir === "left" ? -120 : 120,
      behavior: "smooth",
    });
  };
  const checkArrows = () => {
    const row = chipRowRef.current;
    if (!row) return;
    setCanScrollLeft(row.scrollLeft > 0);
    setCanScrollRight(row.scrollLeft < row.scrollWidth - row.clientWidth - 1);
  };
  useEffect(() => {
    checkArrows();
    const row = chipRowRef.current;
    row?.addEventListener("scroll", checkArrows);
    window.addEventListener("resize", checkArrows);
    return () => {
      row?.removeEventListener("scroll", checkArrows);
      window.removeEventListener("resize", checkArrows);
    };
  }, [tab]);
  function formatSixDigits(raw) {
    if (raw == null || raw === "") return "--";

    const n = Number(raw);
    if (Number.isNaN(n)) return "--";

    const neg = n < 0;
    let s = Math.abs(n).toString();

    // Handle scientific notation safely
    if (/e/i.test(s)) {
      s = Math.abs(n).toFixed(20); // plenty of decimals to slice later
    }

    let [intPart, fracPart = ""] = s.split(".");

    // If integer already has 6+ digits, take first 6 and drop decimals
    if (intPart.length >= 6) {
      const trimmed = intPart.slice(0, 6);
      return (neg ? "-" : "") + trimmed;
    }

    // Otherwise, take just enough decimals to make total digits = 6
    const need = 6 - intPart.length;
    const frac = (fracPart || "").padEnd(need, "0").slice(0, need);

    return (neg ? "-" : "") + intPart + "." + frac;
  }
  return (
    <aside className="bg-[#222733] p-4 border-r border-gray-800 flex flex-col">
      {/* Search Input */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets"
          className="w-full bg-[#23272F] text-sm text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="relative mb-3 flex items-center">
        {canScrollLeft && (
          <button
            onClick={() => scrollChips("left")}
            className="absolute left-0 z-10 bg-[#222733] rounded-full px-1 py-1 h-7 flex items-center justify-center"
            aria-label="Scroll Left"
          >
            &larr;
          </button>
        )}
        <div
          ref={chipRowRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide pl-7 pr-7"
        >
          {["Favourites", "Currencies", "Commodities", "Cryptocurrencies"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setTab(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition ${
                  tab === cat
                    ? "bg-white text-[#222733] border-blue-400"
                    : "bg-[#1A1F27] text-gray-300 border-transparent hover:border-gray-600"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scrollChips("right")}
            className="absolute right-0 z-10 bg-[#222733] rounded-full px-1 py-1 h-7 flex items-center justify-center"
            aria-label="Scroll Right"
          >
            &rarr;
          </button>
        )}
      </div>

      {/* Table Header */}
      <div className="flex text-sm text-gray-300 font-semibold pb-3 border-b border-[#23272F] gap-4">
        <span className="w-2/6">Asset Name</span>
        <span className="w-1/6 text-right">Price</span>
        <span className="w-1/6 text-right">Change</span>
        <span className="w-2/6 text-right">High / Low</span>
        <span className="w-1/6 text-right">Fav</span>
      </div>

      {/* Asset Rows */}
      <ul className="flex-1 overflow-y-auto divide-y divide-[#23272F]">
        {filtered.length === 0 ? (
          <li className="text-center text-gray-500 py-6">No assets found</li>
        ) : (
          filtered.map((asset) => {
            const isFav = favourites.includes(asset.symbol);
            return (
              <li
                key={asset.symbol}
                onClick={() => onSelectSymbol(asset.symbol)}
                className={`flex items-center gap-3 py-3 px-2 rounded-sm cursor-pointer ${
                  selectedSymbol === asset.symbol
                    ? "bg-[#2949ff33]"
                    : "hover:bg-[#1E2A47]"
                }`}
              >
                <span className="w-2/6 flex items-center gap-2 text-white text-sm font-medium truncate">
                  {/* Flags Circle */}
                  <span className="relative flex w-8 h-5">
                    {asset.baseFlag && (
                      <img
                        src={asset.baseFlag}
                        alt={asset.symbol.slice(0, 3)}
                        className="absolute left-0 w-5 h-5 rounded-full border border-gray-800"
                      />
                    )}
                    {asset.quoteFlag && (
                      <img
                        src={asset.quoteFlag}
                        alt={asset.symbol.slice(3, 6)}
                        className="absolute right-0 w-5 h-5 rounded-full border border-gray-800"
                      />
                    )}
                  </span>
                  {asset.title}
                </span>

                <span className="w-1/6 text-center text-gray-200 text-sm">
                  {asset.price != null
                    ? asset.price.toFixed(asset.decimals ?? 5)
                    : "--"}
                </span>
                <span
                  className={`w-1/6 flex justify-end items-center text-sm ${
                    asset.direction === "up"
                      ? "text-green-500"
                      : asset.direction === "down"
                      ? "text-red-500"
                      : "text-gray-200"
                  }`}
                >
                  {asset.changePercent != null
                    ? `${asset.changePercent.toFixed(2)}%`
                    : "--"}
                </span>
                <span className="w-2/6 text-start text-gray-300 text-sm truncate">
                  {asset.high != null && asset.low != null
                    ? `${formatSixDigits(asset.high)}/${formatSixDigits(
                        asset.low
                      )}`
                    : "--/--"}
                </span>
                <button
                  className="w-1/6 flex justify-end"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavourite(asset.symbol);
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill={isFav ? "#FBBF24" : "none"}
                    stroke="#FBBF24"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902
                         0l1.286 3.966a1 1 0 00.95.69h4.18c.969
                         0 1.371 1.24.588 1.81l-3.385
                         2.46a1 1 0 00-.364 1.118l1.287
                         3.965c.3.921-.755 1.688-1.538
                         1.118l-3.386-2.460a1 1
                         0 00-1.175 0l-3.386
                         2.460c-.782.570-1.838-.197-1.538
                         -1.118l1.287-3.965a1 1
                         0 00-.364-1.118l-3.385
                         -2.460c-.783-.570-.380-1.810
                         .588-1.810h4.18a1 1
                         0 00.950-.690l1.286-3.966z"
                    />
                  </svg>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
