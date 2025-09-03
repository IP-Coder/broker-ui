import React, { useMemo, useRef, useState } from "react";
import api from "../api/axios";
import Header from "../components/Header";

/** ----- CONFIG: set your real deposit addresses here ----- */
const ADDRESS_BOOK = {
  TRC20: "TGTUf657Yxu8FJainjxoV7Mwy1bkEykkGy", // <-- TRON (TRC-20) address
  BEP20: "0x53D78d8aD2153063A6fb71ec625946a712C10597", // <-- BNB Smart Chain (BEP-20)
  ERC20: "0x53D78d8aD2153063A6fb71ec625946a712C10597", // <-- Ethereum (ERC-20) address
};
/** ------------------------------------------------------- */

const CURRENCIES = [
  { value: "BINANCE_PAY", label: "Binance Pay" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDT_TRC20", label: "USD Tether (TRC-20)" },
  { value: "USDT_ERC20", label: "USD Tether (ERC-20)" },
  { value: "USDT_BEP20", label: "USD Tether (BEP-20)" },
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "BNB_BSC", label: "Binance Coin (BSC)" },
  { value: "LTC", label: "Litecoin (LTC)" },
  { value: "BCH", label: "Bitcoin Cash (BCH)" },
  { value: "TRX", label: "Tron (TRX)" },
  { value: "USDC_ERC20", label: "USD Coin (USDC ERC-20)" },
];

const CHAINS = [
  { value: "TRC20", label: "TRC-20 (Tron)" },
  { value: "BEP20", label: "BNB Smart Chain (BEP-20)" }, // alias text to match your wording
  { value: "ERC20", label: "Ethereum (ERC-20)" }, // alias text to match your wording
];

export default function Deposit() {
  const [currency, setCurrency] = useState(CURRENCIES[0].value);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const copyBtnRef = useRef(null);

  const walletAddress = useMemo(() => {
    if (!chain) return "";
    return ADDRESS_BOOK[chain] || "";
  }, [chain]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!currency) return setErrorMsg("Please select a cryptocurrency.");
    if (!amount || Number(amount) <= 0)
      return setErrorMsg("Please enter a valid amount.");
    if (!chain)
      return setErrorMsg(
        "Please select the wallet chain (TRC-20 or BNB Smart Chain)."
      );
    if (!walletAddress)
      return setErrorMsg(
        "No wallet address configured for the selected chain."
      );
    if (!receiptFile)
      return setErrorMsg("Please upload a screenshot/receipt of your payment.");

    try {
      setSubmitting(true);

      const fd = new FormData();
      fd.append("type", "deposit");
      fd.append("currency", currency);
      fd.append("amount", amount);
      fd.append("chain", chain);
      fd.append("address", walletAddress);
      fd.append("receipt", receiptFile);

      await api.post("/transactions/create", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      setAmount("");
      setChain("");
      setReceiptFile(null);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          "Could not submit your deposit. Please try again or contact support."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard?.writeText(walletAddress).then(() => {
      if (copyBtnRef.current) {
        const el = copyBtnRef.current;
        const old = el.textContent;
        el.textContent = "Copied!";
        setTimeout(() => (el.textContent = old), 1200);
      }
    });
  }

  return (
    <div className="bg-[#0F1420] min-h-screen text-white">
      <Header />

      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
          Deposit
        </h1>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#1A2130] border border-[#2A3245] rounded-2xl p-4 sm:p-6 lg:p-8 space-y-5"
        >
          {/* Top helper banner (optional) */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-600/20 to-emerald-400/10 p-4 border border-emerald-500/30">
            <div className="text-sm text-emerald-200">
              Select your crypto, enter the amount, pick a chain (TRC-20 or BNB
              Smart Chain), then upload your payment screenshot. Your deposit
              will be reviewed and credited shortly.
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Select Your Crypto Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[#121829] text-white border border-[#2A3245] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-[#121829] text-white border border-[#2A3245] rounded-lg pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Chain */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Select your wallet chain
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              {CHAINS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setChain(opt.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition
                    ${
                      chain === opt.value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[#2A3245] bg-[#121829] hover:border-emerald-600/60"
                    }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-[12px] text-gray-400 mt-0.5">
                    {opt.value === "TRC20"
                      ? "Low fees on Tron network"
                      : "BNB Smart Chain (BEP-20)"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Address (appears after chain chosen) */}
          {chain && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Deposit address ({chain})
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={walletAddress}
                  className="flex-1 bg-[#121829] text-white border border-[#2A3245] rounded-lg px-3 py-2.5"
                />
                <button
                  type="button"
                  ref={copyBtnRef}
                  onClick={copyAddress}
                  className="sm:w-40 rounded-lg bg-[#2BD4A3] text-[#0B1B7F] font-semibold px-4 py-2.5 hover:brightness-95"
                >
                  Copy
                </button>
              </div>
              <div className="text-[12px] text-amber-300/90 mt-2">
                Send only assets over the{" "}
                <span className="font-semibold">{chain}</span> network to this
                address. Sending from the wrong network may result in permanent
                loss.
              </div>
            </div>
          )}

          {/* Receipt / Screenshot */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Payment screenshot (required)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="block w-full file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#2BD4A3] file:text-[#0B1B7F] file:font-semibold bg-[#121829] text-white border border-[#2A3245] rounded-lg px-3 py-2.5"
              required
            />
            <p className="text-[12px] text-gray-400 mt-1">
              Upload a clear screenshot showing the transaction hash /
              reference.
            </p>
          </div>

          {/* Errors */}
          {errorMsg && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto rounded-lg bg-[#0B1B7F] hover:brightness-110 px-6 py-3 font-semibold shadow disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Deposit"}
            </button>
            {success && (
              <span className="ml-3 text-emerald-300 text-sm">
                Deposit submitted. We’ll credit it shortly.
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
