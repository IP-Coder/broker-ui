// src/pages/Banking.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import api from "../api/axios";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "United Arab Emirates",
  "India",
  "Pakistan",
  "Bangladesh",
  "Thailand",
  "Philippines",
  "Vietnam",
  "Nigeria",
  "South Africa",
  "Brazil",
  "Mexico",
  "Other",
];

export default function Banking() {
  const [activeTab, setActiveTab] = useState("withdrawal"); // "withdrawal" | "pending"
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Withdrawal form state
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    beneficiaryCity: "",
    beneficiaryName: "",
    bankAddress: "",
    accountIban: "",
    country: "",
    routingNumber: "",
    swift: "",
    comment: "",
  });

  // Pending requests
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submitWithdrawal(e) {
    e.preventDefault();
    setErrorMsg("");
    setOkMsg("");

    if (!form.amount || Number(form.amount) <= 0)
      return setErrorMsg("Please enter a valid amount.");
    if (!form.bankName) return setErrorMsg("Please enter the bank name.");
    if (!form.beneficiaryName)
      return setErrorMsg("Please enter the beneficiary name.");
    if (!form.accountIban)
      return setErrorMsg("Please enter the Account Number / IBAN.");
    if (!form.country) return setErrorMsg("Please select a country.");

    try {
      setSubmitting(true);
      await api.post("/transactions/create", {
        type: "withdrawal",
        method: "bank",
        amount: form.amount,
        bank_name: form.bankName,
        beneficiary_city: form.beneficiaryCity,
        beneficiary_name: form.beneficiaryName,
        bank_address: form.bankAddress,
        account_iban: form.accountIban,
        country: form.country,
        routing_number: form.routingNumber,
        swift: form.swift,
        comment: form.comment,
      });

      setOkMsg("Withdrawal request submitted. We’ll review it shortly.");
      setForm({
        amount: "",
        bankName: "",
        beneficiaryCity: "",
        beneficiaryName: "",
        bankAddress: "",
        accountIban: "",
        country: "",
        routingNumber: "",
        swift: "",
        comment: "",
      });
      fetchPending();
      setActiveTab("pending");
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          "Could not submit your withdrawal. Please try again or contact support."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchPending() {
    try {
      setLoadingPending(true);
      const res = await api.get("/transactions/my");
      const rows = Array.isArray(res.data) ? res.data : [];
      setPending(rows.filter((r) => r?.status?.toLowerCase?.() === "pending"));
    } finally {
      setLoadingPending(false);
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1420] text-white">
      <Header />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-14">
        {/* Page Tabs (dark theme) */}
        <div className="bg-[#1A2130] border border-[#2A3245] rounded-xl p-2">
          <div className="flex gap-2">
            <TabButton
              label="Withdrawal"
              active={activeTab === "withdrawal"}
              onClick={() => setActiveTab("withdrawal")}
            />
            <TabButton
              label="Pending Requests"
              active={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === "withdrawal" ? (
          <section className="mt-6">
            <h1 className="text-3xl font-extrabold mb-4">Withdrawal</h1>

            <div className="bg-[#1A2130] border border-[#2A3245] rounded-2xl p-5 sm:p-7">
              {/* Sub-card like deposit */}
              <div className="bg-[#143C2F]/30 border border-emerald-500/30 text-emerald-200 rounded-xl p-4 mb-6 text-sm">
                Enter your bank details carefully. Requests are reviewed &
                processed by our payments team.
              </div>

              <div className="mx-auto max-w-2xl">
                {/* Amount summary line (matches screenshot vibe) */}
                <div className="text-sm text-gray-300 mb-4">
                  Withdrawal request amount ($):{" "}
                  <span className="font-semibold text-[#2BD4A3]">
                    {form.amount || 0}
                  </span>
                </div>

                <form onSubmit={submitWithdrawal} className="space-y-4">
                  <Field>
                    <Label>Amount to withdraw (USD)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={form.amount}
                      onChange={(e) => onChange("amount", e.target.value)}
                      placeholder="Amount in USD"
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Bank Name</Label>
                    <Input
                      value={form.bankName}
                      onChange={(e) => onChange("bankName", e.target.value)}
                      placeholder="Bank Name"
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Beneficiary City</Label>
                    <Input
                      value={form.beneficiaryCity}
                      onChange={(e) =>
                        onChange("beneficiaryCity", e.target.value)
                      }
                      placeholder="City"
                    />
                  </Field>

                  <Field>
                    <Label>Beneficiary Name</Label>
                    <Input
                      value={form.beneficiaryName}
                      onChange={(e) =>
                        onChange("beneficiaryName", e.target.value)
                      }
                      placeholder="Full name"
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Bank Address / Sort Code / Branch Number</Label>
                    <Input
                      value={form.bankAddress}
                      onChange={(e) => onChange("bankAddress", e.target.value)}
                      placeholder="Address, Sort Code and/or Branch No."
                    />
                  </Field>

                  <Field>
                    <Label>Account Number / IBAN</Label>
                    <Input
                      value={form.accountIban}
                      onChange={(e) => onChange("accountIban", e.target.value)}
                      placeholder="Account Number or IBAN"
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Select a country</Label>
                    <select
                      value={form.country}
                      onChange={(e) => onChange("country", e.target.value)}
                      className="w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field>
                    <Label>Routing Number</Label>
                    <Input
                      value={form.routingNumber}
                      onChange={(e) =>
                        onChange("routingNumber", e.target.value)
                      }
                      placeholder="Routing Number"
                    />
                  </Field>

                  <Field>
                    <Label>Swift</Label>
                    <Input
                      value={form.swift}
                      onChange={(e) => onChange("swift", e.target.value)}
                      placeholder="SWIFT/BIC"
                    />
                  </Field>

                  <Field>
                    <Label>Comment</Label>
                    <TextArea
                      rows={4}
                      value={form.comment}
                      onChange={(e) => onChange("comment", e.target.value)}
                      placeholder="Any additional information for the finance team"
                    />
                  </Field>

                  {/* Messages */}
                  {errorMsg && (
                    <div className="rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
                      {errorMsg}
                    </div>
                  )}
                  {okMsg && (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-2">
                      {okMsg}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto rounded-lg bg-[#0B1B7F] hover:brightness-110 px-6 py-3 font-semibold shadow disabled:opacity-60"
                    >
                      {submitting ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <h2 className="text-2xl font-extrabold mb-4">Pending Requests</h2>

            <div className="bg-[#1A2130] border border-[#2A3245] rounded-2xl overflow-hidden">
              <div className="p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-300">
                  Showing pending{" "}
                  <span className="font-semibold text-white">withdrawals</span>{" "}
                  and <span className="font-semibold text-white">deposits</span>
                  .
                </p>
                <button
                  onClick={fetchPending}
                  className="text-sm px-3 py-1.5 rounded-md border border-[#2A3245] hover:bg-[#121829]"
                >
                  Refresh
                </button>
              </div>
              <div className="border-t border-[#2A3245] overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#121829] text-gray-300">
                    <tr>
                      <Th>ID</Th>
                      <Th>Type</Th>
                      <Th>Currency</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPending ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-4 py-6 text-center text-gray-400"
                        >
                          Loading…
                        </td>
                      </tr>
                    ) : pending.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-4 py-6 text-center text-gray-400"
                        >
                          No pending requests found.
                        </td>
                      </tr>
                    ) : (
                      pending.map((r) => (
                        <tr key={r.id} className="border-t border-[#2A3245]">
                          <Td>{r.id}</Td>
                          <Td className="capitalize">{r.type ?? "-"}</Td>
                          <Td>{r.currency ?? "-"}</Td>
                          <Td>{r.amount ?? "-"}</Td>
                          <Td>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-200/20 text-amber-300 font-medium">
                              Pending
                            </span>
                          </Td>
                          <Td>
                            {r.created_at
                              ? new Date(r.created_at).toLocaleString()
                              : "-"}
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ---------- Dark theme UI helpers ---------- */
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 sm:px-4 py-2 rounded-md transition
        ${
          active
            ? "bg-[#121829] text-white border border-[#2A3245]"
            : "text-gray-300 hover:bg-[#121829]/60"
        }`}
    >
      <span className="mr-2">•</span>
      {label}
      <span
        className={`absolute left-2 right-2 -bottom-1 h-[2px] ${
          active ? "bg-[#0B1B7F]" : "bg-transparent"
        }`}
      />
    </button>
  );
}

function Field({ children }) {
  return <div className="space-y-1">{children}</div>;
}
function Label({ children }) {
  return <label className="block text-sm text-gray-300">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white
        placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          props.className || ""
        }`}
    />
  );
}
function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md bg-[#121829] border border-[#2A3245] px-3 py-2 text-white
        placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          props.className || ""
        }`}
    />
  );
}
function Th({ children }) {
  return <th className="px-4 py-3 text-left font-semibold">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-gray-200 ${className}`}>{children}</td>;
}
