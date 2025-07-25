// src/components/OpenPositions.jsx
import { useState, useEffect } from "react";
import StopLossTakeProfitModal from "./StopLossTakeProfitModal";
import CloseTradeModal from "./CloseTradeModal";
import {
  X as XIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { format } from "date-fns";

export default function OpenPositions({ onClose }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalPos, setModalPos] = useState(null);
  const [closeModalPos, setCloseModalPos] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);
  const API_URL =
    "http://localhost/PaperTrade/Broker/public/api/orders?status=open";

  // Utility to calculate pip‐distance:
  const calcDistance = (open, curr, type) => {
    const p =
      (parseFloat(curr) - parseFloat(open)) *
      10000 *
      (type === "sell" ? -1 : 1);
    return p.toFixed(2);
  };

  const handleRemoved = (closedId) => {
    setPositions((prev) => prev.filter((p) => p.id !== closedId));
  };
  // 1) initial load
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error(res.statusText);
        const { orders } = await res.json();

        setPositions(
          orders
            .filter((o) => o.status === "open")
            .map((o) => ({
              id: o.id,
              open_time: o.open_time,
              symbol: o.symbol,
              type: o.type,
              volume: o.volume,
              open_price: o.open_price,
              current_price: o.live_price ?? "---",
              // pip distance
              distance:
                o.live_price != null
                  ? calcDistance(o.open_price, o.live_price, o.type)
                  : "---",
              // swap is not returned by your API – default to 0
              swap: "0.00",
              // use floating P/L as “profit”
              profit:
                o.floating_profit_loss != null
                  ? (
                      o.floating_profit_loss *
                      100000 *
                      parseFloat(o.volume)
                    ).toFixed(2)
                  : "---",
            }))
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (reloadCount != null) {
      const fetchAll = async () => {
        try {
          const res = await fetch(API_URL, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          if (!res.ok) throw new Error(res.statusText);
          const { orders } = await res.json();

          setPositions(
            orders
              .filter((o) => o.status === "open")
              .map((o) => ({
                id: o.id,
                open_time: o.open_time,
                symbol: o.symbol,
                type: o.type,
                volume: o.volume,
                open_price: o.open_price,
                current_price: o.live_price ?? "---",
                // pip distance
                distance:
                  o.live_price != null
                    ? calcDistance(o.open_price, o.live_price, o.type)
                    : "---",
                // swap is not returned by your API – default to 0
                swap: "0.00",
                // use floating P/L as “profit”
                profit:
                  o.floating_profit_loss != null
                    ? (
                        o.floating_profit_loss *
                        100000 *
                        parseFloat(o.volume)
                      ).toFixed(2)
                    : "---",
              }))
          );
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchAll();
    }
  }, [reloadCount]);
  // 2) poll only P/L, Current Price & new rows
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error(res.statusText);
        const { orders } = await res.json();
        const open = orders.filter((o) => o.status === "open");

        setPositions((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          open.forEach((o) => {
            const distance = calcDistance(o.open_price, o.live_price, o.type);
            const profit = (
              o.floating_profit_loss *
              100000 *
              parseFloat(o.volume)
            ).toFixed(2);
            if (map.has(o.id)) {
              const ex = map.get(o.id);
              map.set(o.id, {
                ...ex,
                current_price: o.live_price,
                distance,
                profit,
              });
            } else {
              map.set(o.id, {
                id: o.id,
                open_time: o.open_time,
                symbol: o.symbol,
                type: o.type,
                volume: o.volume,
                open_price: o.open_price,
                current_price: o.live_price,
                distance,
                swap: "0.00",
                profit,
              });
            }
          });
          return Array.from(map.values());
        });
      } catch (e) {
        console.error("poll error", e);
      }
    }, 600000); // poll every 10 minutes
    return () => clearInterval(iv);
  }, [loading]);

  if (loading)
    return <div className="py-8 text-center text-gray-400">Loading…</div>;
  if (error)
    return <div className="py-8 text-center text-red-500">Error: {error}</div>;

  return (
    <>
      <div className="bg-[#1A1C1F] rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Open Trades</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-[#23272F] text-gray-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 text-left">Position ID</th>
                <th className="py-3 px-4">Open Time</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Open Price</th>
                <th className="py-3 px-4">Current Price</th>
                <th className="py-3 px-4">Stop Loss</th>
                <th className="py-3 px-4">Take Profit</th>
                <th className="py-3 px-4">Swap</th>
                <th className="py-3 px-4">Profit</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-gray-400">
                    No open positions
                  </td>
                </tr>
              ) : (
                positions.map((p) => (
                  <tr key={p.id} className="border-t border-gray-800">
                    {/* Position ID */}
                    <td className="py-2 px-4 font-medium text-gray-100">
                      #{p.id}
                    </td>

                    {/* Open Time */}
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span>
                          {format(new Date(p.open_time), "dd.MM.yyyy")}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {format(new Date(p.open_time), "HH:mm:ss")}
                        </span>
                      </div>
                    </td>

                    {/* Asset */}
                    <td className="py-2 px-4 font-medium">{p.symbol}</td>

                    {/* Direction */}
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {p.type === "buy" ? (
                          <ArrowUpIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-red-400" />
                        )}
                        <span
                          className={
                            p.type === "buy" ? "text-green-400" : "text-red-400"
                          }
                        >
                          {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
                        </span>
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="py-2 px-4">{p.volume}</td>

                    {/* Distance */}
                    <td className="py-2 px-4">{p.distance}</td>

                    {/* Prices */}
                    <td className="py-2 px-4">{p.open_price}</td>
                    <td className="py-2 px-4">{p.current_price}</td>

                    {/* S/L & T/P */}
                    <td className="py-2 px-4">
                      <button
                        className="px-2 py-1 border border-gray-600 rounded text-xs"
                        onClick={() => setModalPos(p)}
                      >
                        S/L
                      </button>
                    </td>
                    <td className="py-2 px-4">
                      <button
                        className="px-2 py-1 border border-gray-600 rounded text-xs"
                        onClick={() => setModalPos(p)}
                      >
                        T/P
                      </button>
                    </td>

                    {/* Swap */}
                    <td className="py-2 px-4">${p.swap}</td>

                    {/* Profit */}
                    <td className="py-2 px-4">
                      <span
                        className={`font-semibold ${
                          parseFloat(p.profit) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {parseFloat(p.profit) >= 0
                          ? `$${p.profit}`
                          : `-$${Math.abs(p.profit)}`}
                      </span>
                    </td>

                    {/* Close */}
                    <td className="py-2 px-4">
                      <button
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                        onClick={() => setCloseModalPos(p)}
                        disabled={p.profit === "---"}
                      >
                        CLOSE
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalPos && (
        <StopLossTakeProfitModal
          position={modalPos}
          onClose={() => setModalPos(null)}
        />
      )}
      {closeModalPos && (
        <CloseTradeModal
          position={closeModalPos}
          onClose={() => setCloseModalPos(null)}
          onClosed={handleRemoved}
        />
      )}
    </>
  );
}
