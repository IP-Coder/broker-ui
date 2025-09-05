// src/components/TradeHistoryModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  X as XIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { format } from "date-fns";

export default function TradeHistoryModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);

  // fetch closed orders each time modal opens
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/orders?status=closed`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (isMounted) setOrders(data?.orders || []);
      } catch (e) {
        console.error("Closed orders load error:", e);
      }
    };
    if (isOpen) load();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const getContractSize = (symbol) =>
    /^[A-Z]{6}$/.test(symbol || "") ? 100000 : 1; // FX pairs → 100k/lot

  const rows = useMemo(() => {
    return (orders || []).map((o) => {
      const entry = parseFloat(o.open_price);
      const exit = parseFloat(o.close_price ?? o.exit_price);
      const lots = parseFloat(o.volume);
      const dir = o.type === "sell" ? -1 : 1;
      const cs = getContractSize(o.symbol);
      const computed =
        isFinite(entry) && isFinite(exit) && isFinite(lots)
          ? (exit - entry) * cs * lots * dir
          : 0;

      return {
        id: o.id,
        open_time: o.open_time,
        close_time: o.close_time ?? o.closed_at,
        symbol: o.symbol,
        type: o.type, // "buy" | "sell"
        volume: o.volume,
        open_price: o.open_price,
        close_price: o.close_price ?? o.exit_price,
        profit: Number(computed).toFixed(2),
        swap: o.swap ?? o.swap_commission ?? 0,
      };
    });
  }, [orders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-gray-900 text-gray-100 relative rounded-lg shadow-lg overflow-hidden w-full max-w-11xl mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Trade History</h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-800"
            aria-label="Close"
            title="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-850 sticky top-0">
              <tr className="text-left text-gray-400">
                <th className="py-2 px-4">Open Time</th>
                <th className="py-2 px-4">Close Time</th>
                <th className="py-2 px-4">Symbol</th>
                <th className="py-2 px-4">Type</th>
                <th className="py-2 px-4">Lots</th>
                <th className="py-2 px-4">Open</th>
                <th className="py-2 px-4">Close</th>
                <th className="py-2 px-4">Swap</th>
                <th className="py-2 px-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="py-8 px-4 text-center text-gray-400"
                    colSpan={9}
                  >
                    No closed trades yet.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="border-t border-gray-800">
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span>
                          {t.open_time
                            ? format(new Date(t.open_time), "dd.MM.yyyy")
                            : "-"}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {t.open_time
                            ? format(new Date(t.open_time), "HH:mm:ss")
                            : "--:--:--"}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span>
                          {t.close_time
                            ? format(new Date(t.close_time), "dd.MM.yyyy")
                            : "-"}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {t.close_time
                            ? format(new Date(t.close_time), "HH:mm:ss")
                            : "--:--:--"}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-4 font-medium">{t.symbol}</td>

                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {t.type === "buy" ? (
                          <>
                            <ArrowUpIcon className="w-4 h-4 text-green-400" />
                            <span className="text-green-300">Buy</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownIcon className="w-4 h-4 text-red-400" />
                            <span className="text-red-300">Sell</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-4">{t.volume}</td>
                    <td className="py-2 px-4">{t.open_price}</td>
                    <td className="py-2 px-4">{t.close_price}</td>
                    <td className="py-2 px-4">${t.swap}</td>

                    <td className="py-2 px-4">
                      <span
                        className={`font-semibold ${
                          parseFloat(t.profit) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {parseFloat(t.profit) >= 0
                          ? `$${t.profit}`
                          : `-$${Math.abs(parseFloat(t.profit)).toFixed(2)}`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
