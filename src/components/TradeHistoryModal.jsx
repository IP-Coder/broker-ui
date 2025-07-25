// src/components/TradeHistoryModal.jsx
import React from "react";
import {
  X as XIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { format } from "date-fns";

export default function TradeHistoryModal({ isOpen, onClose, orders }) {
  if (!isOpen) return null;

  const mapped = orders.map((o) => {
    const profit =
      o.profit != null
        ? o.profit
        : (
            (o.close_price - o.open_price) *
            o.volume *
            (o.type === "sell" ? -1 : 1)
          ).toFixed(2);

    return {
      id: o.id,
      open_time: o.open_time,
      close_time: o.close_time ?? o.closed_at,
      symbol: o.symbol,
      type: o.type,
      volume: o.volume,
      open_price: o.open_price,
      close_price: o.close_price ?? o.exit_price,
      profit: profit.toString(),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="relative bg-[#1A1C1F] rounded-lg shadow-lg overflow-hidden w-full max-w-5xl mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Trade History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-[#23272F] text-gray-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4">Trade ID</th>
                <th className="py-3 px-4">Opened</th>
                <th className="py-3 px-4">Closed</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Entry Price</th>
                <th className="py-3 px-4">Exit Price</th>
                <th className="py-3 px-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {mapped.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    No trade history
                  </td>
                </tr>
              ) : (
                mapped.map((t) => (
                  <tr key={t.id} className="border-t border-gray-800">
                    <td className="py-2 px-4 font-medium text-gray-100">
                      #{t.id}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span>
                          {format(new Date(t.open_time), "dd.MM.yyyy")}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {format(new Date(t.open_time), "HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span>
                          {format(new Date(t.close_time), "dd.MM.yyyy")}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {format(new Date(t.close_time), "HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 font-medium">{t.symbol}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {t.type === "buy" ? (
                          <ArrowUpIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-red-400" />
                        )}
                        <span
                          className={
                            t.type === "buy" ? "text-green-400" : "text-red-400"
                          }
                        >
                          {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4">{t.volume}</td>
                    <td className="py-2 px-4">{t.open_price}</td>
                    <td className="py-2 px-4">{t.close_price}</td>
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
                          : `-$${Math.abs(t.profit)}`}
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
