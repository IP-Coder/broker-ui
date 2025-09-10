// src/pages/UserProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Header from "../components/Header";

// minimal country & dial code lists (expand anytime)
const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Other",
];
const DIAL_CODES = [
  { cc: "IN", code: "+91" },
  { cc: "US", code: "+1" },
  { cc: "GB", code: "+44" },
  { cc: "AE", code: "+971" },
  { cc: "CA", code: "+1" },
  { cc: "AU", code: "+61" },
];

export default function UserProfile() {
  const [tab, setTab] = useState("personal"); // 'personal' | 'account' | 'password' | 'referral'
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  // unified profile state used by Personal + Account tabs
  const [profile, setProfile] = useState({
    // personal
    first_name: "",
    last_name: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    address_line: "",
    postal_code: "",
    city: "",
    country: "India",
    email: "",
    phone_code: "+91",
    phone: "",
    email2: "",
    username: "",
    account_type: "demo", // 'demo' | 'live'
  });

  // password tab state
  const [pwd, setPwd] = useState({
    old_password: "",
    new_password: "",
    show: false,
  });

  // NEW: KYC state
  const [kyc, setKyc] = useState({
    loading: false,
    status: null, // 'pending' | 'approved' | 'rejected' | null
    aadhaar_last4: "",
    document_url: "",
    selfie_url: "",
    submitted_at: "",
    review_notes: "",
  });

  // referral tab state
  const [ref, setRef] = useState({
    loading: false,
    code: "",
    referred_count: 0,
    total_reward: 0,
    history: [],
    error: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        const u = res.data || {};
        setProfile((p) => ({
          ...p,
          first_name: u.first_name || u.name?.split(" ")?.[0] || "",
          last_name:
            u.last_name || u.name?.split(" ")?.slice(1).join(" ") || "",
          birth_day: u.birth_day || "",
          birth_month: u.birth_month || "",
          birth_year: u.birth_year || "",
          address_line: u.address_line || u.address || "",
          postal_code: u.postal_code || "",
          city: u.city || "",
          country: u.country || p.country,
          email: u.email || "",
          phone_code: u.phone_code || p.phone_code,
          mobile: u.mobile || u.phone || "",
          email2: u.email2 || "",
          username: u.username || u.email || "",
          account_type: u.account_type || "demo",
        }));
      } catch (e) {
        setMsg({ ok: "", err: "Unable to load profile." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch referral data on first switch to referral tab (lazy load)
  useEffect(() => {
    if (tab !== "referral" || ref.loading || ref.code) return;
    (async () => {
      try {
        setRef((s) => ({ ...s, loading: true, error: "" }));
        const [myRes, histRes] = await Promise.allSettled([
          api.get("/refer/my"),
          api.get("/refer/history"),
        ]);

        let code = "";
        let referred_count = 0;
        let total_reward = 0;
        let history = [];

        if (myRes.status === "fulfilled") {
          const d = myRes.value?.data || {};
          code = d.code || "";
          referred_count = Number(d.referred_count || 0);
          total_reward = Number(d.total_reward || 0);
        } else {
          throw new Error("Unable to load referral info.");
        }

        if (histRes.status === "fulfilled") {
          history = Array.isArray(histRes.value?.data)
            ? histRes.value.data
            : [];
        } // if failed, just keep empty history silently

        setRef({
          loading: false,
          code,
          referred_count,
          total_reward,
          history,
          error: "",
        });
      } catch (e) {
        setRef((s) => ({
          ...s,
          loading: false,
          error: "Unable to load referral info.",
        }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // NEW: Lazy load KYC when tab opens
  useEffect(() => {
    if (tab !== "kyc" || kyc.loading) return;
    (async () => {
      try {
        setKyc((s) => ({ ...s, loading: true }));
        const { data } = await api.get("/kyc/my"); // new backend
        if (data?.exists) {
          setKyc({
            loading: false,
            status: data.status,
            aadhaar_last4: data.aadhaar_last4 || "",
            document_url: data.document_url || "",
            selfie_url: data.selfie_url || "",
            submitted_at: data.submitted_at || "",
            review_notes: data.review_notes || "",
          });
        } else {
          setKyc((s) => ({ ...s, loading: false }));
        }
      } catch {
        setKyc((s) => ({ ...s, loading: false }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ----- helpers -----
  function update(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  async function saveProfile(e) {
    e?.preventDefault?.();
    setMsg({ ok: "", err: "" });
    try {
      await api.post("/user/update", profile);
      setMsg({ ok: "Profile updated successfully.", err: "" });
    } catch (e) {
      setMsg({ ok: "", err: e?.response?.data?.message || "Update failed." });
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setMsg({ ok: "", err: "" });
    if (!passwordChecks.ok) {
      return setMsg({
        ok: "",
        err: "Password does not meet minimum requirements.",
      });
    }
    try {
      await api.post("/user/change-password", {
        old_password: pwd.old_password,
        new_password: pwd.new_password,
      });
      setPwd({ old_password: "", new_password: "", show: false });
      setMsg({ ok: "Password changed successfully.", err: "" });
    } catch (e) {
      setMsg({
        ok: "",
        err: e?.response?.data?.message || "Could not change password.",
      });
    }
  }

  // password requirements
  const passwordChecks = useMemo(() => {
    const s = pwd.new_password || "";
    const okLen = s.length >= 8;
    const okU = /[A-Z]/.test(s);
    const okL = /[a-z]/.test(s);
    const okD = /\d/.test(s);
    const okAsciiLetters = /^[\x20-\x7E]*$/.test(s); // simple latin-only check
    return {
      ok: okLen && okU && okL && okD && okAsciiLetters,
      okLen,
      okU,
      okL,
      okD,
      okAsciiLetters,
    };
  }, [pwd.new_password]);

  // date options
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const arr = [];
    for (let i = y; i >= 1900; i--) arr.push(i);
    return arr;
  }, []);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-[#0F1420] min-h-screen text-white">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-14">
        {/* Card */}
        <div className="bg-[#1A2130] border border-[#2A3245] rounded-2xl overflow-hidden">
          {/* Top bar */}
          <div className="bg-[#0B1B7F] px-5 py-4 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold">My Profile</h2>
          </div>

          {/* Tabs */}
          <div className="px-3 sm:px-5 pt-3">
            <div className="flex flex-wrap gap-2">
              <TabButton
                label="Personal Details"
                active={tab === "personal"}
                onClick={() => setTab("personal")}
              />
              <TabButton
                label="Account Details"
                active={tab === "account"}
                onClick={() => setTab("account")}
              />
                 <TabButton label="KYC" active={tab === "kyc"} onClick={() => setTab("kyc")} />
              <TabButton
                label="Change Password"
                active={tab === "password"}
                onClick={() => setTab("password")}
              />
              <TabButton
                label="Referral"
                active={tab === "referral"}
                onClick={() => setTab("referral")}
              />
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            {loading ? (
              <div className="text-gray-400">Loading…</div>
            ) : tab === "personal" ? (
              <form
                onSubmit={saveProfile}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* left column */}
                <section>
                  <h3 className="text-lg font-bold mb-3">Personal details</h3>
                  <Field>
                    <Input
                      placeholder="First name"
                      value={profile.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <Input
                      placeholder="Last name"
                      value={profile.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                    />
                  </Field>

                  <div className="mt-4">
                    <Label>Birth Date</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={profile.birth_day}
                        onChange={(e) => update("birth_day", e.target.value)}
                      >
                        <option value="">Day</option>
                        {days.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={profile.birth_month}
                        onChange={(e) => update("birth_month", e.target.value)}
                      >
                        <option value="">Month</option>
                        {months.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={profile.birth_year}
                        onChange={(e) => update("birth_year", e.target.value)}
                      >
                        <option value="">Year</option>
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </section>

                {/* right column */}
                <section>
                  <h3 className="text-lg font-bold mb-3">Address</h3>
                  <Field>
                    <Input
                      placeholder="Street / Address"
                      value={profile.address_line}
                      onChange={(e) => update("address_line", e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Postal code"
                      value={profile.postal_code}
                      onChange={(e) => update("postal_code", e.target.value)}
                    />
                    <div className="col-span-2">
                      <Input
                        placeholder="City"
                        value={profile.city}
                        onChange={(e) => update("city", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Select
                      value={profile.country}
                      onChange={(e) => update("country", e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                </section>

                {/* footer actions */}
                <div className="lg:col-span-2 flex justify-end">
                  <Button type="submit">Update</Button>
                </div>
              </form>
            ) : tab === "account" ? (
              <form
                onSubmit={saveProfile}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <section>
                  <h3 className="text-lg font-bold mb-3">
                    Account Information
                  </h3>
                  <Field>
                    <Input
                      placeholder="User Name (email)"
                      value={profile.username}
                      disabled
                    />
                  </Field>

                  <Label className="mt-4 mb-1">Phone Numbers</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={profile.phone_code}
                      onChange={(e) => update("phone_code", e.target.value)}
                    >
                      {DIAL_CODES.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code}
                        </option>
                      ))}
                    </Select>
                    <div className="col-span-2">
                      <Input
                        placeholder="Primary Phone"
                        value={profile.mobile}
                        onChange={(e) => update("mobile", e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mt-9" />
                  <Field>
                    <Input
                      placeholder="Primary Email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                    <span className="text-xs text-emerald-300 mt-1">
                      Verify email
                    </span>
                  </Field>
                  <Field className="mt-2">
                    <Input
                      placeholder="Secondary Email"
                      type="email"
                      value={profile.email2}
                      onChange={(e) => update("email2", e.target.value)}
                    />
                  </Field>
                </section>

                <div className="lg:col-span-2 flex justify-end">
                  <Button type="submit">Update</Button>
                </div>
              </form>
            ) : tab === "kyc" ? (
              <KycTab
                state={kyc}
                onSubmitted={(t) => {
                  setMsg({ ok: t || "KYC submitted successfully.", err: "" });
                }}
                onError={(t) =>
                  setMsg({ ok: "", err: t || "KYC submission failed." })
                }
                onRefresh={async () => {
                  try {
                    const { data } = await api.get("/kyc/my");
                    if (data?.exists)
                      setKyc((s) => ({ ...s, ...data, loading: false }));
                  } catch {}
                }}
              />
            ) : tab === "password" ? (
              <form
                onSubmit={changePassword}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <section>
                  <Field>
                    <Input
                      placeholder="Old Password"
                      type="password"
                      value={pwd.old_password}
                      onChange={(e) =>
                        setPwd({ ...pwd, old_password: e.target.value })
                      }
                    />
                  </Field>
                  <Field className="mt-2 relative">
                    <Input
                      placeholder="New Password"
                      type={pwd.show ? "text" : "password"}
                      value={pwd.new_password}
                      onChange={(e) =>
                        setPwd({ ...pwd, new_password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-300"
                      onClick={() => setPwd((s) => ({ ...s, show: !s.show }))}
                    >
                      {pwd.show ? "Hide" : "Show"}
                    </button>
                  </Field>
                  <div className="mt-4">
                    <Button type="submit">Submit</Button>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">
                    The minimum requirements for strong password are:
                  </h4>
                  <Req ok={passwordChecks.okLen}>At least 8 characters</Req>
                  <Req ok={passwordChecks.okU}>One uppercase letter</Req>
                  <Req ok={passwordChecks.okL}>One lowercase letter</Req>
                  <Req ok={passwordChecks.okD}>One-digit number</Req>
                  <Req ok={passwordChecks.okAsciiLetters}>
                    Only in Latin letters
                  </Req>
                </section>
              </form>
            ) : (
              <ReferralTab
                refState={ref}
                setRefState={setRef}
                onCopied={(t) => {
                  // lightweight toast
                  setMsg({ ok: t, err: "" });
                  setTimeout(() => setMsg({ ok: "", err: "" }), 1200);
                }}
              />
            )}

            {/* global messages */}
            {(msg.err || msg.ok) && (
              <div className="mt-6">
                {msg.err && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
                    {msg.err}
                  </div>
                )}
                {msg.ok && (
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-2">
                    {msg.ok}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- NEW: KYC Tab ---------- */
function KycTab({ state, onSubmitted, onError, onRefresh }) {
  const [aadhaar, setAadhaar] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isValidAadhaar = (v) => /^\d{12}$/.test(v);
  const MAX_MB = 8;

  async function submitKyc(e) {
    e?.preventDefault?.();
    if (!isValidAadhaar(aadhaar)) return onError?.("Aadhaar must be exactly 12 digits.");
    if (!docFile || !selfieFile) return onError?.("Please upload document and selfie.");
    if (docFile.size > MAX_MB*1024*1024 || selfieFile.size > MAX_MB*1024*1024) return onError?.("Each file must be ≤ 8 MB.");

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("aadhaar_number", aadhaar);
      fd.append("document", docFile);
      fd.append("selfie", selfieFile);
      await api.post("/kyc/submit", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAadhaar(""); setDocFile(null); setSelfieFile(null);
      onSubmitted?.("KYC submitted. We’ll notify you after review.");
      await onRefresh?.();
    } catch (err) {
      onError?.(err?.response?.data?.message || "KYC submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section>
        <h3 className="text-lg font-bold mb-3">KYC Verification</h3>
        <div className="bg-[#121829] border border-[#2A3245] rounded-md p-4">
          <div className="text-sm text-gray-300">Status</div>
          <div className="mt-1">
            {!state.status ? (
              <span className="text-gray-400">No submission yet</span>
            ) : (
              <span className={{
                pending: "text-amber-300",
                approved: "text-emerald-300",
                rejected: "text-red-300",
              }[state.status] || "text-gray-300"}>
                {state.status.toUpperCase()}
              </span>
            )}
          </div>
          {!!state.aadhaar_last4 && <div className="mt-1 text-xs text-gray-400">Aadhaar: •••• •••• •••• {state.aadhaar_last4}</div>}
          {!!state.review_notes && <div className="mt-1 text-xs text-gray-400">Notes: {state.review_notes}</div>}
        </div>
      </section>

      <form onSubmit={submitKyc} className="space-y-4">
        <Field>
          <Label htmlFor="aadhaar">Aadhaar Number</Label>
          <Input
            id="aadhaar"
            inputMode="numeric"
            pattern="\d{12}"
            maxLength={12}
            placeholder="12-digit Aadhaar"
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
            required
          />
          <span className={`text-xs ${isValidAadhaar(aadhaar) || !aadhaar ? "text-gray-400" : "text-red-300"}`}>
            Must be exactly 12 digits.
          </span>
        </Field>

        <div>
          <Label>Upload Document Photo</Label>
          <input type="file" accept="image/*"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#0B1B7F] file:text-white hover:file:brightness-110"
            required
          />
        </div>

        <div>
          <Label>Live Selfie</Label>
          <input type="file" accept="image/*" capture="user"
            onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#0B1B7F] file:text-white hover:file:brightness-110"
            required
          />
          <div className="mt-2 text-xs text-gray-400">Tip: good lighting, face centered, no sunglasses.</div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit KYC"}</Button>
        </div>
      </form>
    </div>
  );
}

/* ---------- keep your existing UI atoms + ReferralTab + other forms ---------- */
// PersonalForm, AccountForm, PasswordForm, ReferralTab, Field, Label, Input, Select, Button, Req, formatDate, formatMoney...

/* ---------- Referral Tab ---------- */
function ReferralTab({ refState, setRefState, onCopied }) {
  const { loading, code, referred_count, total_reward, history, error } =
    refState;

  const link = useMemo(() => {
    if (!code) return "";
    const base =
      import.meta?.env?.VITE_PUBLIC_SIGNUP_URL ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/register`
        : "/register");
    return `${base}?ref=${encodeURIComponent(code)}`;
  }, [code]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      onCopied?.("Referral link copied!");
    } catch {
      onCopied?.("Could not copy link.");
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-bold mb-3">Refer & Earn</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#121829] border border-[#2A3245] rounded-md p-4 md:col-span-2">
            <div className="text-sm text-gray-300 mb-1">Your referral link</div>
            {loading ? (
              <div className="h-11 rounded-md bg-[#0f1524] animate-pulse" />
            ) : code ? (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={link}
                  className="flex-1 h-11 rounded-md bg-[#0f1524] border border-[#2A3245] px-3 text-white text-sm"
                />
                <Button type="button" onClick={copy}>
                  Copy
                </Button>
              </div>
            ) : (
              <div className="text-gray-400">No referral code available.</div>
            )}

            <div className="mt-3 text-xs text-gray-400">
              Share this link with friends. When they sign up using it, you earn
              rewards.
            </div>
          </div>

          <div className="bg-[#121829] border border-[#2A3245] rounded-md p-4">
            <div className="text-sm text-gray-300">Overview</div>
            <div className="mt-2">
              {loading ? (
                <div className="h-20 rounded-md bg-[#0f1524] animate-pulse" />
              ) : (
                <>
                  <div className="text-sm text-gray-400">Total Referred</div>
                  <div className="text-2xl font-extrabold">
                    {referred_count || 0}
                  </div>
                  <div className="mt-2 text-sm text-gray-400">Total Reward</div>
                  <div className="text-xl font-bold">
                    {formatMoney(total_reward || 0)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h4 className="text-lg font-bold mb-3">Referral History</h4>
        <div className="bg-[#121829] border border-[#2A3245] rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A3245] text-sm text-gray-300">
            Your referrals and rewards
          </div>

          {loading ? (
            <div className="p-4">
              <div className="h-8 w-full bg-[#0f1524] rounded mb-2 animate-pulse" />
              <div className="h-8 w-full bg-[#0f1524] rounded mb-2 animate-pulse" />
              <div className="h-8 w-full bg-[#0f1524] rounded animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-4 text-red-300 text-sm">{error}</div>
          ) : !history?.length ? (
            <div className="p-4 text-gray-400 text-sm">No referrals yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#0f1524] text-gray-300">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => {
                    const when = formatDate(r.created_at);
                    const who =
                      r.referred_name ||
                      r.referred_email ||
                      r.user_email ||
                      r.user_name ||
                      "-";
                    const reward = formatMoney(r.reward_amount || 0);
                    return (
                      <tr key={r.id} className="border-t border-[#2A3245]">
                        <td className="px-4 py-2 text-gray-300">{when}</td>
                        <td className="px-4 py-2">{who}</td>
                        <td className="px-4 py-2">{reward}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- Small UI atoms (dark theme) ---------- */
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 sm:px-4 py-2 rounded-md transition ${
        active
          ? "bg-[#121829] text-white border border-[#2A3245]"
          : "text-gray-300 hover:bg-[#121829]/60"
      }`}
    >
      {label}
      <span
        className={`absolute left-2 right-2 -bottom-1 h-[2px] ${
          active ? "bg-[#0B1B7F]" : "bg-transparent"
        }`}
      />
    </button>
  );
}

function Field({ children, className = "" }) {
  return <div className={`space-y-1 ${className}`}>{children}</div>;
}
function Label({ children, className = "" }) {
  return (
    <label className={`block text-sm text-gray-300 ${className}`}>
      {children}
    </label>
  );
}
function Input(props) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
        props.className || ""
      }`}
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
        props.className || ""
      }`}
    />
  );
}
function Button({ children, ...rest }) {
  return (
    <button
      {...rest}
      className="bg-[#0B1B7F] hover:brightness-110 px-6 py-2.5 rounded-md font-semibold shadow disabled:opacity-60"
    >
      {children}
    </button>
  );
}
function Req({ ok, children }) {
  return (
    <div className="flex items-center gap-2 text-sm mb-2">
      <span
        className={`w-4 h-4 inline-flex items-center justify-center rounded-full border ${
          ok
            ? "bg-emerald-500/80 border-emerald-400"
            : "bg-transparent border-gray-500"
        }`}
      >
        {ok ? "✓" : ""}
      </span>
      <span className={`${ok ? "text-emerald-200" : "text-gray-300"}`}>
        {children}
      </span>
    </div>
  );
}

/* ---------- tiny utils ---------- */
function formatDate(input) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
function formatMoney(n) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
}
