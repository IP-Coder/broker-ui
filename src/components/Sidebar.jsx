import React, { useEffect, useRef, useState } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

// Expose Pusher on window so Echo can use it
window.Pusher = Pusher;

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
  const [symbols, setSymbols] = useState([]);
  const [tab, setTab] = useState("Currencies");
  const [favourites, setFavourites] = useState([]);
  const [search, setSearch] = useState("");
  const chipRowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const echoRef = useRef(null);
  const channelsRef = useRef([]);

  // 1️⃣ Fetch symbols AND subscribe once on mount
  useEffect(() => {
    let echo = null;
    let chans = [];

    (async () => {
      try {
        // Fetch and initialize symbol state
        const res = await fetch("http://localhost/server/public/api/symbols");
        const { symbols: raw = [] } = await res.json();
        const mapped = raw.map((s) => ({
          ...s,
          safeSymbol: s.symbol.replace(":", "_"),
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
        }));
        setSymbols(mapped);

        // Set up Echo / Pusher
        Pusher.logToConsole = false;
        echo = new Echo({
          broadcaster: "pusher",
          key: import.meta.env.VITE_PUSHER_KEY,
          cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
          forceTLS: true,
          disableStats: true,
        });
        echoRef.current = echo;

        echo.connector.pusher.connection.bind("connected", () =>
          console.log("✅ Echo/Pusher connected")
        );
        echo.connector.pusher.connection.bind("error", (err) =>
          console.error("⛔️ Echo/Pusher error", err)
        );

        // Subscribe to price + tick channels for each symbol
        chans = mapped.flatMap((asset) => {
          const safe = asset.safeSymbol;

          const priceCh = echo
            .channel(`market.price.OANDA_${safe}`)
            .subscribed(() =>
              console.log(`✅ Subscribed to market.price.OANDA_${safe}`)
            )
            .listen(".price.update", (data) => {
              // console.log("📈 price.update", data);
              const incoming = data.symbol.replace("OANDA:", "");
              // console.log(incoming);
              setSymbols((prev) =>
                prev.map((a) => {
                  if (a.safeSymbol !== incoming) return a;
                  const mid = parseFloat(data.last_price);
                  const init = a.initialPrice ?? mid;
                  const dir = mid > init ? "up" : mid < init ? "down" : "same";
                  const pct =
                    init !== null ? ((mid - init) / init) * 100 : null;
                  return {
                    ...a,
                    initialPrice: init,
                    direction: dir,
                    changePercent: pct,
                    high: a.high != null ? Math.max(a.high, mid) : mid,
                    low: a.low != null ? Math.min(a.low, mid) : mid,
                  };
                })
              );
            });

          const tickCh = echo
            .channel(`market.tick.OANDA_${safe}`)
            .subscribed(() =>
              console.log(`✅ Subscribed to market.tick.OANDA_${safe}`)
            )
            .listen(".tick.update", (data) => {
              // console.log("🔄 tick.update", data);
              const incoming = data.symbol.replace("OANDA:", "");
              setSymbols((prev) =>
                prev.map((a) =>
                  a.safeSymbol !== incoming
                    ? a
                    : {
                        ...a,
                        price: data.bid,
                        ask: data.ask,
                        bid: data.bid,
                        askSize: data.ask_size ?? data.askSize,
                        bidSize: data.bid_size ?? data.bidSize,
                      }
                )
              );
            });

          return [priceCh, tickCh];
        });

        channelsRef.current = chans;
      } catch (err) {
        console.error("Failed to load symbols or subscribe", err);
      }
    })();

    // Cleanup on unmount
    return () => {
      chans.forEach((ch) => {
        ch.stopListening(".price.update");
        ch.stopListening(".tick.update");
        echo.leaveChannel(ch.name);
      });
      if (echo) echo.disconnect();
    };
  }, []); // run once

  // 2️⃣ Load user favourites
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch(
          "http://localhost/server/public/api/favorites",
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        const { favorites = [] } = await res.json();
        setFavourites(favorites.map((f) => f.symbol));
      } catch (err) {
        console.error("Failed to load favorites", err);
      }
    })();
  }, [user]);

  // 3️⃣ Toggle favourite
  const toggleFavourite = async (symbol) => {
    if (!user) return;
    const isFav = favourites.includes(symbol);
    const updated = isFav
      ? favourites.filter((f) => f !== symbol)
      : [...favourites, symbol];
    setFavourites(updated);
    try {
      await fetch(
        `http://localhost/server/public/api/favorites${
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
    } catch {
      setFavourites(favourites);
    }
  };

  // 4️⃣ Filter & categorize
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

  // 5️⃣ Scroll logic for tabs
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
                <span className="w-2/6 text-white text-sm font-medium truncate">
                  {asset.title}
                </span>
                <span className="w-1/6 text-right text-gray-200 text-sm">
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
                <span className="w-2/6 text-right text-gray-400 text-sm truncate">
                  {asset.high != null && asset.low != null
                    ? `${asset.high.toFixed(
                        asset.decimals ?? 5
                      )}/${asset.low.toFixed(asset.decimals ?? 5)}`
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
