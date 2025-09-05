// src/components/MobileTradeControls.jsx
import React from "react";

export default function MobileTradeControls({
  onPendingClick,
  onOpenClick,
  onHistoryClick,
}) {
  const tradeButtons = [
    {
      id: "pending",
      label: "Pending",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      onClick: onPendingClick,
      color: "bg-yellow-600 hover:bg-yellow-700",
    },
    {
      id: "open",
      label: "Open",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      onClick: onOpenClick,
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "history",
      label: "History",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      onClick: onHistoryClick,
      color: "bg-blue-600 hover:bg-blue-700",
    },
  ];

  return (
    <div className="mobile-trade-controls">
      <div className="mobile-trade-controls-container">
        <div className="mobile-trade-controls-header">
          <h3 className="text-sm font-medium text-gray-300">
            Trade Management
          </h3>
        </div>

        <div className="mobile-trade-buttons">
          {tradeButtons.map((button) => (
            <button
              key={button.id}
              onClick={button.onClick}
              className={`mobile-trade-button ${button.color}`}
            >
              <div className="mobile-trade-button-content">
                <div className="mobile-trade-button-icon">{button.icon}</div>
                <span className="mobile-trade-button-text">{button.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Optional: Quick stats row */}
        <div className="mobile-quick-stats">
          <div className="mobile-stat-item">
            <span className="text-xs text-gray-400">Active</span>
            <span className="text-sm font-medium text-white">--</span>
          </div>
          <div className="mobile-stat-item">
            <span className="text-xs text-gray-400">P&L</span>
            <span className="text-sm font-medium text-green-400">--</span>
          </div>
          <div className="mobile-stat-item">
            <span className="text-xs text-gray-400">Balance</span>
            <span className="text-sm font-medium text-white">--</span>
          </div>
        </div>
      </div>
    </div>
  );
}
