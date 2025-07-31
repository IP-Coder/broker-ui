// src/components/PendingOrdersModal.jsx
import React, { useState, useEffect } from "react";
import {
  X as XIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { format } from "date-fns";

const API_URL = "https://api.binaryprofunding.net/api/orders";

export default function PendingOrdersModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);

  // fetch pending orders each time modal opens
  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (isMounted) {
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error("Pending orders fetch error:", err);
      }
    }
    if (isOpen) {
      fetchOrders();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const mapped = orders.map((o) => ({
    id: o.id,
    placed_time: o.open_time ?? o.created_at,
    symbol: o.symbol,
    side: o.type || o.side,
    volume: o.volume,
    price: o.price ?? o.open_price,
    stopLoss: o.stop_loss ?? "---",
    takeProfit: o.take_profit ?? "---",
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="relative bg-[#1A1C1F] rounded-lg shadow-lg overflow-hidden w-full max-w-4xl mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Pending Orders</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-[#23272F] text-gray-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 text-left">Order ID</th>
                <th className="py-3 px-4">Placed</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">S/L</th>
                <th className="py-3 px-4">T/P</th>
              </tr>
            </thead>
            <tbody>
              {mapped.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No pending orders
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
                          {format(new Date(o.placed_time), "dd.MM.yyyy")}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <ClockIcon className="w-4 h-4" />
                          {format(new Date(o.placed_time), "HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 font-medium">{o.symbol}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {o.side === "buy" ? (
                          <ArrowUpIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-red-400" />
                        )}
                        <span
                          className={
                            o.side === "buy" ? "text-green-400" : "text-red-400"
                          }
                        >
                          {o.side.charAt(0).toUpperCase() + o.side.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4">{o.volume}</td>
                    <td className="py-2 px-4">${Number(o.price).toFixed(5)}</td>
                    <td className="py-2 px-4">{o.stopLoss}</td>
                    <td className="py-2 px-4">{o.takeProfit}</td>
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
