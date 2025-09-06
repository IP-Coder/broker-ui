import React, { useEffect, useMemo, useState } from "react";
import { X as XIcon } from "lucide-react";

/**
 * DROP-IN REPLACEMENT
 * -------------------------------------------------
 * This component enforces best-practice SL/TP rules:
 *  - BUY:  SL must be < current price;  TP must be > current price
 *  - SELL: SL must be > current price;  TP must be < current price
 *  - Optional min distance (in pips) from current price
 *  - Derives pip size from price precision (overrideable)
 *  - Works with existing props shape used by OpenOrdersModal
 *
 * Props expected (same as before):
 *  - position: {
 *      id, symbol, type: 'buy'|'sell', volume,
 *      open_price, stop_loss_price?, take_profit_price?, current_price?
 *    }
 *  - onClose(updatedPositionOrUndefined)
 *  - user? (ignored, kept for drop-in compatibility)
 *  - currentPrice? (optional explicit current price if available)
 *  - minDistancePips? number (default 1)
 *  - pipSize? number (e.g. 0.0001). If not provided, inferred from open_price precision.
 */

const DEFAULT_PIP_VALUE_PER_LOT = 10; // $10 per pip per 1.00 lot (major FX)

function inferPipSizeFromPrice(price) {
  const p = Number(price);
  if (!isFinite(p)) return 0.0001;
  const s = ("" + price).split(".")[1];
  const decimals = s ? s.length : 0;
  // If 5 decimals (EURUSD-style pricing), 1 pip = 0.00010
  // If 4 decimals, 1 pip = 0.0001
  // If 3 decimals (e.g., XAUUSD), pick 0.01 as a sensible "pip" step
  // If 2 decimals (JPY pairs often 3), 1 pip = 0.01
  if (decimals >= 4) return 1 / 10000; // 0.0001
  if (decimals === 3) return 1 / 100; // 0.01
  if (decimals <= 2) return 1 / 100; // 0.01
  return 1 / 10000;
}

export default function StopLossTakeProfitModal({
  position,
  user,
  onClose,
  currentPrice,
  minDistancePips = 1,
  pipSize,
}) {
  // ---------- Derived basics ----------
  const entry = useMemo(() => Number(position?.open_price) || 0, [position]);
  const current = useMemo(() => {
    const p = Number(
      currentPrice ?? position?.current_price ?? position?.live_price ?? entry
    );
    return isFinite(p) ? p : entry;
  }, [currentPrice, position, entry]);

  const ONE_PIP = useMemo(
    () => pipSize ?? inferPipSizeFromPrice(entry || current || 1),
    [pipSize, entry, current]
  );
  const PIP_FACTOR = useMemo(() => 1 / ONE_PIP, [ONE_PIP]);
  const minDistance = useMemo(
    () => (minDistancePips || 0) * ONE_PIP,
    [minDistancePips, ONE_PIP]
  );

  const [useSL, setUseSL] = useState(Boolean(position?.stop_loss_price));
  const [useTP, setUseTP] = useState(Boolean(position?.take_profit_price));

  // Represent both pips and price so user can edit either
  const [slPips, setSlPips] = useState(50);
  const [tpPips, setTpPips] = useState(50);
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pip value estimate (simple): volume * $10/pip
  const pipValue = useMemo(
    () => (Number(position?.volume) || 0) * DEFAULT_PIP_VALUE_PER_LOT,
    [position?.volume]
  );

  // ---------- Initialize from existing SL/TP ----------
  useEffect(() => {
    const dec = Math.max(0, ("" + entry).split(".")[1]?.length || 0);
    const fmt = (v) => (isFinite(v) ? v.toFixed(dec) : "");

    if (position?.stop_loss_price != null) {
      const sl = Number(position.stop_loss_price);
      setUseSL(true);
      setSlPrice(fmt(sl));
      const diffPips = Math.round(Math.abs((entry - sl) * PIP_FACTOR));
      setSlPips(diffPips);
    } else {
      setUseSL(false);
      // default SL one side of entry respecting direction
      const sl =
        position?.type === "buy" ? entry - 50 * ONE_PIP : entry + 50 * ONE_PIP;
      setSlPrice(fmt(sl));
      setSlPips(50);
    }

    if (position?.take_profit_price != null) {
      const tp = Number(position.take_profit_price);
      setUseTP(true);
      setTpPrice(fmt(tp));
      const diffPips = Math.round(Math.abs((tp - entry) * PIP_FACTOR));
      setTpPips(diffPips);
    } else {
      setUseTP(false);
      const tp =
        position?.type === "buy" ? entry + 50 * ONE_PIP : entry - 50 * ONE_PIP;
      setTpPrice(fmt(tp));
      setTpPips(50);
    }
  }, [position, entry, ONE_PIP, PIP_FACTOR]);

  // ---------- Keep price in sync when pips change ----------
  useEffect(() => {
    if (!useSL) return;
    const price =
      position?.type === "buy"
        ? entry - slPips * ONE_PIP
        : entry + slPips * ONE_PIP;
    const dec = Math.max(0, ("" + entry).split(".")[1]?.length || 0);
    setSlPrice(price.toFixed(dec));
  }, [slPips, useSL, position?.type, entry, ONE_PIP]);

  useEffect(() => {
    if (!useTP) return;
    const price =
      position?.type === "buy"
        ? entry + tpPips * ONE_PIP
        : entry - tpPips * ONE_PIP;
    const dec = Math.max(0, ("" + entry).split(".")[1]?.length || 0);
    setTpPrice(price.toFixed(dec));
  }, [tpPips, useTP, position?.type, entry, ONE_PIP]);

  // ---------- Keep pips in sync when price changes by user ----------
  const handleSlPriceChange = (v) => {
    const n = Number(v);
    setSlPrice(v);
    if (!isFinite(n)) return;
    const diff = Math.abs(entry - n);
    setSlPips(Math.max(0, Math.round(diff * PIP_FACTOR)));
  };

  const handleTpPriceChange = (v) => {
    const n = Number(v);
    setTpPrice(v);
    if (!isFinite(n)) return;
    const diff = Math.abs(n - entry);
    setTpPips(Math.max(0, Math.round(diff * PIP_FACTOR)));
  };

  // ---------- Validation helpers ----------
  function validateSides(sl, tp) {
    const isBuy = position?.type === "buy";

    if (useSL) {
      if (!isFinite(sl)) return "Enter a valid Stop Loss price.";
      // BUY: SL < current - min; SELL: SL > current + min
      if (isBuy) {
        if (!(sl < current - 1e-12) || !(current - sl >= minDistance)) {
          return `Invalid SL for Buy: must be at least ${minDistancePips} pip(s) below current price (${fmtPrice(
            current
          )}).`;
        }
      } else {
        if (!(sl > current + 1e-12) || !(sl - current >= minDistance)) {
          return `Invalid SL for Sell: must be at least ${minDistancePips} pip(s) above current price (${fmtPrice(
            current
          )}).`;
        }
      }
    }

    if (useTP) {
      if (!isFinite(tp)) return "Enter a valid Take Profit price.";
      // BUY: TP > current + min; SELL: TP < current - min
      if (isBuy) {
        if (!(tp > current + 1e-12) || !(tp - current >= minDistance)) {
          return `Invalid TP for Buy: must be at least ${minDistancePips} pip(s) above current price (${fmtPrice(
            current
          )}).`;
        }
      } else {
        if (!(tp < current - 1e-12) || !(current - tp >= minDistance)) {
          return `Invalid TP for Sell: must be at least ${minDistancePips} pip(s) below current price (${fmtPrice(
            current
          )}).`;
        }
      }
    }

    return "";
  }

  function fmtPrice(v) {
    const dec = Math.max(0, ("" + entry).split(".")[1]?.length || 5);
    return Number(v).toFixed(dec);
  }

  useEffect(() => {
    const sl = Number(slPrice);
    const tp = Number(tpPrice);
    setError(validateSides(sl, tp));
  }, [slPrice, tpPrice, useSL, useTP, current, minDistance, position?.type]);

  // ---------- Profit preview ----------
  const slProfit = useMemo(() => {
    if (!useSL) return "--";
    const pips = Math.abs(Number(slPips) || 0);
    if (pips === 0) return "--";
    return `–$${(pips * pipValue).toFixed(2)}`;
  }, [useSL, slPips, pipValue]);

  const tpProfit = useMemo(() => {
    if (!useTP) return "--";
    const pips = Math.abs(Number(tpPips) || 0);
    if (pips === 0) return "--";
    return `+$${(pips * pipValue).toFixed(2)}`;
  }, [useTP, tpPips, pipValue]);

  // ---------- Submit ----------
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    const sl = useSL ? Number(slPrice) : null;
    const tp = useTP ? Number(tpPrice) : null;

    const validationMsg = validateSides(sl ?? NaN, tp ?? NaN);
    if (validationMsg) {
      setError(validationMsg);
      setIsSubmitting(false);
      return;
    }

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
            stop_loss_price: useSL ? sl : null,
            take_profit_price: useTP ? tp : null,
          }),
        }
      );
      const json = await res.json();
      if (json.status === "success") {
        onClose?.(json.data);
      } else {
        setError(json.message || "Update failed");
      }
    } catch (e) {
      console.error(e);
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Render ----------
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={() => onClose?.()}
    >
      <div
        className="bg-[#23272F] rounded-lg w-[800px] p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Stop Loss / Take Profit #{position?.id}
          </h3>
          <button
            onClick={() => onClose?.()}
            className="text-gray-400 hover:text-white"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-5 gap-4 text-gray-400 text-sm mb-6">
          <div>
            <div className="text-xs uppercase">Asset Name</div>
            <div className="text-white font-medium">{position?.symbol}</div>
          </div>
          <div>
            <div className="text-xs uppercase">Direction</div>
            <div
              className={`font-medium ${
                position?.type === "buy" ? "text-green-400" : "text-red-400"
              }`}
            >
              {position?.type?.[0]?.toUpperCase()}
              {position?.type?.slice(1)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase">Lots</div>
            <div className="text-white font-medium">{position?.volume}</div>
          </div>
          <div>
            <div className="text-xs uppercase">Open Price</div>
            <div className="text-white font-medium">{fmtPrice(entry)}</div>
          </div>
          <div>
            <div className="text-xs uppercase">Current Price</div>
            <div className="text-white font-medium">{fmtPrice(current)}</div>
          </div>
        </div>

        {/* Current SL/TP */}
        <div className="grid grid-cols-2 gap-6 mb-4 text-gray-400 text-sm">
          <div>
            Current SL:{" "}
            <span className="text-white">
              {position?.stop_loss_price
                ? fmtPrice(position.stop_loss_price)
                : "--"}
            </span>
          </div>
          <div>
            Current TP:{" "}
            <span className="text-white">
              {position?.take_profit_price
                ? fmtPrice(position.take_profit_price)
                : "--"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-6">
          {/* SL */}
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
                step={ONE_PIP}
                className="w-full bg-[#2C2F33] text-gray-200 p-2 rounded"
                value={slPrice}
                onChange={(e) => handleSlPriceChange(e.target.value)}
                readOnly={!useSL}
              />
              <div className="text-xs text-gray-400 mt-1">
                Must be {position?.type === "buy" ? `below` : `above`} current
                by ≥ {minDistancePips} pip(s).
              </div>
            </div>
            <div className="text-sm text-gray-400">{slProfit}</div>
          </div>

          {/* TP */}
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
                step={ONE_PIP}
                className="w-full bg-[#2C2F33] text-gray-200 p-2 rounded"
                value={tpPrice}
                onChange={(e) => handleTpPriceChange(e.target.value)}
                readOnly={!useTP}
              />
              <div className="text-xs text-gray-400 mt-1">
                Must be {position?.type === "buy" ? `above` : `below`} current
                by ≥ {minDistancePips} pip(s).
              </div>
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
              isSubmitting || !!error
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-white text-black hover:bg-gray-200"
            }`}
            onClick={handleSubmit}
            disabled={isSubmitting || !!error}
          >
            {isSubmitting ? "Updating..." : "Submit Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
