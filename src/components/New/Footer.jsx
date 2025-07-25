import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOrders } from "../hooks/useOrders";
import { useRealtimeOrders } from "../hooks/useRealtimeOrders";
import useAccount from "../hooks/useAccount";
import PendingOrdersModal from "./PendingOrdersModal";
import OpenOrdersModal from "./OpenOrdersModal";
import TradeHistoryModal from "./TradeHistoryModal";

const queryClient = new QueryClient();

function FooterContent() {
  const { data: pendingOrders = [] } = useOrders("pending");
  const { data: openOrders = [] } = useOrders("open");
  const { data: historyOrders = [] } = useOrders("closed");
  const { data: account = {} } = useAccount();

  useRealtimeOrders(account.user_id);

  const [showPending, setShowPending] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Stats formatting
  const { balance, credit, equity, used_margin } = account;
  const freeMargin =
    equity != null && used_margin != null ? equity - used_margin : null;
  const marginLevel =
    equity != null && used_margin != null ? (equity / used_margin) * 100 : null;
  const profitLoss =
    equity != null && balance != null ? equity - balance : null;

  const fmtAmt = (n) => (n == null ? "---" : `$${Number(n).toFixed(2)}`);
  const fmtPct = (n) => (n == null ? "---" : `${Number(n).toFixed(2)}%`);

  const stats = [
    ["Balance", fmtAmt(balance)],
    ["Credit", fmtAmt(credit)],
    [
      "P / L",
      profitLoss != null
        ? `${profitLoss >= 0 ? "+" : "-"}$${Math.abs(profitLoss).toFixed(2)}`
        : "---",
    ],
    ["Equity", fmtAmt(equity)],
    ["Used Margin", fmtAmt(used_margin)],
    ["Free Margin", fmtAmt(freeMargin)],
    ["Margin Level", fmtPct(marginLevel)],
  ];

  return (
    <>
      <footer className="bg-[#232834] h-14 flex items-center justify-between px-8 border-t border-gray-800">
        <div className="flex space-x-6 overflow-x-auto">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col items-center min-w-[80px]"
            >
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-sm text-white">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowPending(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Pending Orders
          </button>
          <button
            onClick={() => setShowOpen(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Open Orders
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Trade History
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Powered by</span>
            <a
              href="https://forexfeed.net"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/forexfeed-logo.svg" alt="ForexFeed" className="h-4" />
            </a>
          </div>
        </div>
      </footer>

      <PendingOrdersModal
        isOpen={showPending}
        onClose={() => setShowPending(false)}
        orders={pendingOrders}
      />
      <OpenOrdersModal
        isOpen={showOpen}
        onClose={() => setShowOpen(false)}
        orders={openOrders}
      />
      <TradeHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        orders={historyOrders}
      />
    </>
  );
}

export default function Footer() {
  return (
    <QueryClientProvider client={queryClient}>
      <FooterContent />
    </QueryClientProvider>
  );
}
