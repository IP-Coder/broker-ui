// src/components/StopLossTakeProfitModal.jsx
import { X as XIcon } from "lucide-react";
import { useState, useEffect } from "react";

export default function StopLossTakeProfitModal({ position, onClose }) {
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");

  // TODO: fetch historical price data for the chart from your Laravel 12 API
  // useEffect(() => {
  //   fetch(`/api/orders/${position.id}/history`).then(...)
  // }, [position.id]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#23272F] rounded-lg w-[800px] p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Stop Loss / Take Profit #{position.id}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Asset / Direction / Lots / Open Price */}
        <div className="grid grid-cols-4 gap-4 text-gray-400 text-sm mb-6">
          <div>
            <div className="text-xs uppercase">Asset Name</div>
            <div className="text-white font-medium">{position.symbol}</div>
          </div>
          <div>
            <div className="text-xs uppercase">Direction</div>
            <div
              className={`font-medium ${
                position.type === "buy" ? "text-green-400" : "text-red-400"
              }`}
            >
              {position.type.charAt(0).toUpperCase() + position.type.slice(1)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase">Lots</div>
            <div className="text-white font-medium">{position.volume}</div>
          </div>
          <div>
            <div className="text-xs uppercase">Open Price</div>
            <div className="text-white font-medium">{position.open_price}</div>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="h-48 bg-[#1C1E22] rounded mb-6 flex items-center justify-center text-gray-600">
          {/* You can drop in react-chartjs-2 or any chart lib here */}
          Chart goes here
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-6">
          {/* Stop Loss */}
          <div className="bg-[#1C1E22] p-4 rounded">
            <label className="inline-flex items-center mb-2">
              <input type="checkbox" className="form-checkbox h-4 w-4 mr-2" />
              <span className="text-sm text-white">Set Stop Loss</span>
            </label>
            <div className="flex items-center mb-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded-l text-white"
                onClick={() => {
                  /* decrease pip */
                }}
              >
                –
              </button>
              <input
                type="number"
                className="w-16 text-center bg-[#23272F] text-white"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder="Pips"
              />
              <button
                className="px-2 py-1 bg-gray-700 rounded-r text-white"
                onClick={() => {
                  /* increase pip */
                }}
              >
                +
              </button>
            </div>
            <div className="mb-2">
              <input
                type="text"
                className="w-full bg-[#2C2F33] text-gray-400 p-2 rounded"
                value={
                  sl &&
                  (
                    parseFloat(position.open_price) -
                    parseFloat(sl) / 10000
                  ).toFixed(5)
                }
                readOnly
              />
            </div>
            <div className="text-sm text-gray-400">$-5,290.00</div>
          </div>

          {/* Take Profit */}
          <div className="bg-[#1C1E22] p-4 rounded">
            <label className="inline-flex items-center mb-2">
              <input type="checkbox" className="form-checkbox h-4 w-4 mr-2" />
              <span className="text-sm text-white">Set Take Profit</span>
            </label>
            <div className="flex items-center mb-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded-l text-white"
                onClick={() => {
                  /* decrease pip */
                }}
              >
                –
              </button>
              <input
                type="number"
                className="w-16 text-center bg-[#23272F] text-white"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder="Pips"
              />
              <button
                className="px-2 py-1 bg-gray-700 rounded-r text-white"
                onClick={() => {
                  /* increase pip */
                }}
              >
                +
              </button>
            </div>
            <div className="mb-2">
              <input
                type="text"
                className="w-full bg-[#2C2F33] text-gray-400 p-2 rounded"
                value={
                  tp &&
                  (
                    parseFloat(position.open_price) +
                    parseFloat(tp) / 10000
                  ).toFixed(5)
                }
                readOnly
              />
            </div>
            <div className="text-sm text-gray-400">$4,710.00</div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 text-center">
          <button
            className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-200"
            onClick={() => {
              // TODO: submit SL/TP to your Laravel 12 API
              onClose();
            }}
          >
            Submit Changes
          </button>
        </div>
      </div>
    </div>
  );
}
