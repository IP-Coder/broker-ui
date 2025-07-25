import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { X as XIcon } from "lucide-react";
import { useCloseOrder } from "../hooks/useOrders";

export default function CloseTradeModal({ position, isOpen, onClose }) {
  if (!isOpen) return null;

  const [partial, setPartial] = useState(false);
  const [closeVolume, setCloseVolume] = useState(position.volume);
  const { mutateAsync: closeOrder, isLoading } = useCloseOrder();

  useEffect(() => {
    // reset when position changes
    setCloseVolume(position.volume);
    setPartial(false);
  }, [position]);

  const handleConfirm = async () => {
    try {
      await closeOrder(position.id);
      onClose();
    } catch (e) {
      alert("Error closing trade: " + e.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#23272F] rounded-lg w-96 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <XIcon className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-white mb-4">
          Close Trade #{position.id}
        </h3>
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
        </div>
        <label className="inline-flex items-center mb-4 text-gray-400">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 mr-2"
            checked={partial}
            onChange={(e) => setPartial(e.target.checked)}
          />
          <span>Partial Close</span>
        </label>
        {partial && (
          <input
            type="number"
            min="0.01"
            max={position.volume}
            step="0.01"
            className="w-full bg-[#1C1E22] text-white p-2 rounded mb-4"
            value={closeVolume}
            onChange={(e) => setCloseVolume(e.target.value)}
          />
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-[#1C1E22] rounded text-white hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            {isLoading ? "Closing…" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

CloseTradeModal.propTypes = {
  position: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
