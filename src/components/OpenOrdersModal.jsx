import React, { useState, useEffect, useRef, useMemo } from "react";
import { socket } from "../socketClient"; // ✅ socket.io-client
import StopLossTakeProfitModal from "./StopLossTakeProfitModal";
import CloseTradeModal from "./CloseTradeModal";
import {
  X as XIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { format } from "date-fns";

export default function OpenOrdersModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [slTp, setSlTp] = useState(null);
  const [closeO, setCloseO] = useState(null);
  const [liveTicks, setLiveTicks] = useState({}); // { SYMBOL: { bid, ask } }

  const mountedRef = useRef(true);

  // 1️⃣ Fetch open orders each time the modal opens
  useEffect(() => {
    async function fetchOrders() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/orders?status=open`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        console.log(data);
        setOrders(data.orders || []);
        console.log(orders);
      } catch (err) {
        console.error("Open orders fetch error:", err);
      }
    }

    if (isOpen) fetchOrders();

    return () => {
      mountedRef.current = false;
    };
  }, [isOpen]);

  // 2️⃣ Subscribe to real-time tick updates via socket.io
  useEffect(() => {
    const handleTick = (data) => {
      if (!data.code) return;
      const symbol = data.code.replace("OANDA:", "");
      if (data.bid && data.ask) {
        setLiveTicks((prev) => ({
          ...prev,
          [symbol]: {
            bid: parseFloat(data.bid),
            ask: parseFloat(data.ask),
          },
        }));
      }
    };

    socket.on("tick", handleTick);
    return () => socket.off("tick", handleTick);
  }, []);

  // 3️⃣ Derived mapped data for UI
  const mapped = useMemo(
    () =>
      orders.map((o) => {
        const ticks = liveTicks[o.symbol] || {};
        const current =
          ticks[o.type === "buy" ? "bid" : "ask"] ?? parseFloat(o.live_price);

        const distance =
          o.open_price && current
            ? (
                (current - parseFloat(o.open_price)) *
                10000 *
                (o.type === "sell" ? -1 : 1)
              ).toFixed(2)
            : "---";

        const profit =
          o.volume && current
            ? (
                (current - parseFloat(o.open_price)) *
                100000 *
                parseFloat(o.volume) *
                (o.type === "sell" ? -1 : 1)
              ).toFixed(2)
            : "---";

        return {
          id: o.id,
          open_time: o.open_time,
          symbol: o.symbol,
          type: o.type,
          volume: o.volume,
          sl_price: o.stop_loss_price,
          tp_price: o.take_profit_price,
          open_price: parseFloat(o.open_price).toFixed(5),
          current_price: current != null ? current.toFixed(5) : "---",
          distance,
          swap: parseFloat(o.swap_cost || 0).toFixed(2),
          profit,
        };
      }),
    [orders, liveTicks]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="relative bg-[#1A1C1F] rounded-lg shadow-lg overflow-hidden w-full max-w-11xl mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Open Orders</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-[#23272F] text-gray-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 text-left">Order ID</th>
                <th className="py-3 px-4">Opened</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Open Price</th>
                <th className="py-3 px-4">Current Price</th>
                <th className="py-3 px-4">S/L</th>
                <th className="py-3 px-4">T/P</th>
                <th className="py-3 px-4">Swap</th>
                <th className="py-3 px-4">Profit</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {mapped.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-gray-400">
                    No open orders
                  </td>
                </tr>
              ) : (
                mapped.map((o) => (
                  <tr key={o.id} className="border-t border-gray-800">
                    <td className="py-2 px-4 font-medium text-gray-100">
                      #{o.id}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span>
                          {format(new Date(o.open_time), "dd.MM.yyyy")}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {format(new Date(o.open_time), "HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 font-medium">{o.symbol}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {o.type === "buy" ? (
                          <ArrowUpIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-red-400" />
                        )}
                        <span
                          className={
                            o.type === "buy" ? "text-green-400" : "text-red-400"
                          }
                        >
                          {o.type.charAt(0).toUpperCase() + o.type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4">{o.volume}</td>
                    <td className="py-2 px-4">{o.distance}</td>
                    <td className="py-2 px-4">{o.open_price}</td>
                    <td className="py-2 px-4">{o.current_price}</td>
                    <td className="py-2 px-4">
                      <button
                        className="px-2 py-1 border border-gray-600 rounded text-xs"
                        onClick={() => setSlTp(o)}
                      >
                        S/L
                      </button>
                    </td>
                    <td className="py-2 px-4">
                      <button
                        className="px-2 py-1 border border-gray-600 rounded text-xs"
                        onClick={() => setSlTp(o)}
                      >
                        T/P
                      </button>
                    </td>
                    <td className="py-2 px-4">${o.swap}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`font-semibold ${
                          parseFloat(o.profit) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {parseFloat(o.profit) >= 0
                          ? `+$${o.profit}`
                          : `-$${Math.abs(o.profit)}`}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <button
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                        onClick={() => setCloseO(o)}
                        disabled={o.profit === "---"}
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

        {slTp && (
          <StopLossTakeProfitModal
            position={slTp}
            onClose={() => setSlTp(null)}
          />
        )}
        {closeO && (
          <CloseTradeModal
            position={closeO}
            onClose={() => {
              setCloseO(null);
              onClose(closeO);
            }}
            onClosed={() => setCloseO(null)}
          />
        )}
      </div>
    </div>
  );
}
