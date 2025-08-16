import { X as XIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { socket } from "../socketClient"; // ✅ Import socket

export default function CloseTradeModal({ position, onClose, onClosed }) {
  const [currentPrice, setCurrentPrice] = useState(position.current_price);
  const [profit, setProfit] = useState(position.profit);
  const [partial, setPartial] = useState(false);
  const [closeVolume, setCloseVolume] = useState(position.volume);
  const [submitting, setSubmitting] = useState(false);

  // 1️⃣ Subscribe to socket.io tick for live price
  useEffect(() => {
    const handleTick = (data) => {
      if (!data.code) return;
      const symbol = data.code.replace("OANDA:", "");
      if (symbol !== position.symbol) return;

      const price =
        position.type === "buy" ? parseFloat(data.bid) : parseFloat(data.ask);

      if (!price) return;

      setCurrentPrice(price.toFixed(5));

      const p =
        (price - parseFloat(position.open_price)) *
        parseFloat(closeVolume) *
        100000 *
        (position.type === "sell" ? -1 : 1);

      setProfit(p.toFixed(2));
    };

    socket.on("tick", handleTick);
    return () => socket.off("tick", handleTick);
  }, [position, closeVolume]);

  // 2️⃣ Submit close order with live data
  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/order/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          order_id: position.id,
          close_price: parseFloat(currentPrice),
          profit_loss: parseFloat(profit),
          volume: parseFloat(closeVolume),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onClosed(position.id);
    } catch (e) {
      console.error(e.message);
      alert("Error closing trade: " + e.message);
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#23272F] rounded-lg w-96 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Close Trade #{position.id}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-gray-400 text-sm mb-4">
          <div className="flex justify-between">
            <span>Asset</span>
            <span className="text-white">{position.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span>Lots</span>
            <span className="text-white">{position.volume}</span>
          </div>
          <div className="flex justify-between">
            <span>Open Price</span>
            <span className="text-white">{position.open_price}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Price</span>
            <span className="text-white">{currentPrice}</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-gray-400">
            Close the trade now with current profit
          </p>
          <p
            className={`text-2xl font-bold ${
              parseFloat(profit) >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {profit >= 0 ? `$${profit}` : `-$${Math.abs(profit)}`}
          </p>
        </div>

        {/* <label className="inline-flex items-center mb-4 text-gray-400">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 mr-2"
            checked={partial}
            onChange={(e) => setPartial(e.target.checked)}
          />
          <span>Partial Close</span>
        </label>

        {partial && (
          <div className="mb-4">
            <input
              type="number"
              min="0.01"
              max={position.volume}
              step="0.01"
              className="w-full bg-[#1C1E22] text-white p-2 rounded"
              value={closeVolume}
              onChange={(e) => setCloseVolume(e.target.value)}
            />
          </div>
        )} */}

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1C1E22] rounded text-white hover:bg-gray-700"
            disabled={submitting}
          >
            No
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={submitting}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
