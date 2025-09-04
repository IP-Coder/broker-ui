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
  const [tab, setTab] = useState("personal"); // 'personal' | 'account' | 'password'
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
    // account
    email: "",
    phone_code: "+91",
    phone: "",
    phone2_code: "+44",
    phone2: "",
    email2: "",
    // username (readonly hint)
    username: "",
  });

  // password tab state
  const [pwd, setPwd] = useState({
    old_password: "",
    new_password: "",
    show: false,
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
          phone: u.mobile || u.phone || "",
          phone2_code: u.phone2_code || p.phone2_code,
          phone2: u.phone2 || "",
          email2: u.email2 || "",
          username: u.username || u.email || "",
        }));
      } catch (e) {
        setMsg({ ok: "", err: "Unable to load profile." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
              <TabButton
                label="Change Password"
                active={tab === "password"}
                onClick={() => setTab("password")}
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
                        value={profile.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Select
                      value={profile.phone2_code}
                      onChange={(e) => update("phone2_code", e.target.value)}
                    >
                      {DIAL_CODES.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code}
                        </option>
                      ))}
                    </Select>
                    <div className="col-span-2">
                      <Input
                        placeholder="Secondary Phone"
                        value={profile.phone2}
                        onChange={(e) => update("phone2", e.target.value)}
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
            ) : (
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
