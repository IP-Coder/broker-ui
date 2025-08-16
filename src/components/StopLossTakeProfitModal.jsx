import React, { useState, useEffect, useMemo } from "react";
import { X as XIcon } from "lucide-react";

const PIP_FACTOR = 10000;
const ONE_PIP = 1 / PIP_FACTOR;
const PIP_VALUE_PER_LOT = 10; // Assuming $10 per pip for 1 lot

export default function StopLossTakeProfitModal({ position, user, onClose }) {
  const [useSL, setUseSL] = useState(false);
  const [useTP, setUseTP] = useState(false);
  const [slPips, setSlPips] = useState(50);
  const [tpPips, setTpPips] = useState(50);
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize from existing SL/TP
  useEffect(() => {
    if (position.stop_loss_price != null) {
      const sl = parseFloat(position.stop_loss_price);
      setUseSL(true);
      setSlPrice(sl.toFixed(5));
      const diff = (parseFloat(position.open_price) - sl) * PIP_FACTOR;
      setSlPips(Math.max(0, Math.round(diff)));
    }
    if (position.take_profit_price != null) {
      const tp = parseFloat(position.take_profit_price);
      setUseTP(true);
      setTpPrice(tp.toFixed(5));
      const diff = (tp - parseFloat(position.open_price)) * PIP_FACTOR;
      setTpPips(Math.max(0, Math.round(diff)));
    }
  }, [
    position.open_price,
    position.stop_loss_price,
    position.take_profit_price,
  ]);

  // P&L per pip
  const pipValue = useMemo(
    () => position.volume * PIP_VALUE_PER_LOT,
    [position.volume]
  );

  // Sync price when pips change
  useEffect(() => {
    if (!useSL) return;
    const entry = parseFloat(position.open_price);
    setSlPrice(
      position.type === "buy"
        ? (entry - slPips * ONE_PIP).toFixed(5)
        : (entry + slPips * ONE_PIP).toFixed(5)
    );
  }, [slPips, useSL, position.open_price]);

  useEffect(() => {
    if (!useTP) return;
    const entry = parseFloat(position.open_price);
    setTpPrice(
      position.type === "buy"
        ? (entry + tpPips * ONE_PIP).toFixed(5)
        : (entry - tpPips * ONE_PIP).toFixed(5)
    );
  }, [tpPips, useTP, position.open_price]);

  // Sync pips when price changes
  const handleSlPriceChange = (newPrice) => {
    setSlPrice(newPrice);
    const diff = (parseFloat(position.open_price) - newPrice) * PIP_FACTOR;
    setSlPips(Math.max(0, Math.round(diff)));
  };
  const handleTpPriceChange = (newPrice) => {
    setTpPrice(newPrice);
    const diff = (newPrice - parseFloat(position.open_price)) * PIP_FACTOR;
    setTpPips(Math.max(0, Math.round(diff)));
  };

  // Profit display
  const slProfit =
    useSL && slPips > 0 ? `–$${(slPips * pipValue).toFixed(2)}` : "--";
  const tpProfit =
    useTP && tpPips > 0 ? `+$${(tpPips * pipValue).toFixed(2)}` : "--";

  // Submit update
  console.log(position);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/order/${position.id}/sl-tp`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            stop_loss_price: useSL ? parseFloat(slPrice) : null,
            take_profit_price: useTP ? parseFloat(tpPrice) : null,
          }),
        }
      );
      const json = await res.json();
      if (json.status === "success") {
        onClose(json.data);
      } else {
        setError(json.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={() => onClose()}
    >
      <div
        className="bg-[#23272F] rounded-lg w-[800px] p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Current SL/TP */}
        <div className="grid grid-cols-2 gap-6 mb-4 text-gray-400 text-sm">
          <div>
            Current SL:{" "}
            <span className="text-white">{position.sl_price ?? "--"}</span>
          </div>
          <div>
            Current TP:{" "}
            <span className="text-white">{position.tp_price ?? "--"}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-6">
          {/* Stop Loss */}
          <div className="bg-[#1C1E22] p-4 rounded">
            <label className="inline-flex items-center mb-2">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 mr-2"
                checked={useSL}
                onChange={() => setUseSL((v) => !v)}
              />
              <span className="text-sm text-white">Set Stop Loss</span>
            </label>
            <div className="flex items-center mb-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded-l text-white"
                disabled={!useSL}
                onClick={() => setSlPips((p) => Math.max(0, p - 1))}
              >
                –
              </button>
              <input
                type="number"
                min={0}
                step={1}
                className="w-16 text-center bg-[#23272F] text-white"
                value={slPips}
                onChange={(e) => setSlPips(+e.target.value)}
                disabled={!useSL}
              />
              <button
                className="px-2 py-1 bg-gray-700 rounded-r text-white"
                disabled={!useSL}
                onClick={() => setSlPips((p) => p + 1)}
              >
                +
              </button>
            </div>
            <div className="mb-2">
              <input
                type="number"
                step="0.00001"
                className="w-full bg-[#2C2F33] text-gray-400 p-2 rounded"
                value={slPrice}
                onChange={(e) => handleSlPriceChange(+e.target.value)}
                readOnly={!useSL}
              />
            </div>
            <div className="text-sm text-gray-400">{slProfit}</div>
          </div>

          {/* Take Profit */}
          <div className="bg-[#1C1E22] p-4 rounded">
            <label className="inline-flex items-center mb-2">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 mr-2"
                checked={useTP}
                onChange={() => setUseTP((v) => !v)}
              />
              <span className="text-sm text-white">Set Take Profit</span>
            </label>
            <div className="flex items-center mb-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded-l text-white"
                disabled={!useTP}
                onClick={() => setTpPips((p) => Math.max(0, p - 1))}
              >
                –
              </button>
              <input
                type="number"
                min={0}
                step={1}
                className="w-16 text-center bg-[#23272F] text-white"
                value={tpPips}
                onChange={(e) => setTpPips(+e.target.value)}
                disabled={!useTP}
              />
              <button
                className="px-2 py-1 bg-gray-700 rounded-r text-white"
                disabled={!useTP}
                onClick={() => setTpPips((p) => p + 1)}
              >
                +
              </button>
            </div>
            <div className="mb-2">
              <input
                type="number"
                step="0.00001"
                className="w-full bg-[#2C2F33] text-gray-400 p-2 rounded"
                value={tpPrice}
                onChange={(e) => handleTpPriceChange(+e.target.value)}
                readOnly={!useTP}
              />
            </div>
            <div className="text-sm text-gray-400">{tpProfit}</div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="mt-4 text-red-500 text-center">{error}</div>}

        {/* Submit */}
        <div className="mt-6 text-center">
          <button
            className={`px-6 py-2 rounded-lg font-medium ${
              isSubmitting
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-white text-black hover:bg-gray-200"
            }`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Submit Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
