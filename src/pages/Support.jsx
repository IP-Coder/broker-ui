import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import api from "../api/axios";

/** 👇 Replace this with your official WhatsApp number */
const SUPPORT_WHATSAPP = "+919876543210";

const DIAL_CODES = [
  { cc: "IN", code: "+91" }, { cc: "US", code: "+1" }, { cc: "GB", code: "+44" },
  { cc: "AE", code: "+971" }, { cc: "CA", code: "+1" }, { cc: "AU", code: "+61" },
];

export default function Support() {
  const [form, setForm] = useState({
    name: "", email: "", dialCode: "+91", phone: "", subject: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });
  const [copied, setCopied] = useState(false);

  // Prefill from /me
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/me");
        const u = me.data || {};
        setForm((f) => ({
          ...f,
          name: u.first_name || u.name || "",
          email: u.email || "",
          dialCode: u.phone_code || f.dialCode,
          phone: u.mobile || u.phone || "",
        }));
      } catch (_) {}
    })();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const supportNumberPlain = useMemo(
    () => (SUPPORT_WHATSAPP || "").replace(/[^\d]/g, ""),
    []
  );

  const waMessage = useMemo(() => {
    const lines = [
      "Hi Support!",
      `Name: ${form.name || "-"}`,
      `Email: ${form.email || "-"}`,
      `Phone: ${form.dialCode || ""} ${form.phone || "-"}`,
      form.subject ? `Subject: ${form.subject}` : "",
      form.message ? `Message: ${form.message}` : "",
    ].filter(Boolean);
    return lines.join(" | ");
  }, [form]);

  function openWhatsApp() {
    if (!supportNumberPlain) return;
    const url = `https://wa.me/${supportNumberPlain}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function submitTicket(e) {
    e.preventDefault();
    setMsg({ ok: "", err: "" });

    if (!form.name)  return setMsg({ ok: "", err: "Please enter your name." });
    if (!form.email) return setMsg({ ok: "", err: "Please enter your email." });
    if (!form.phone) return setMsg({ ok: "", err: "Please enter your contact number." });
    if (!form.message) return setMsg({ ok: "", err: "Please add a message." });

    try {
      setSubmitting(true);
      // Adjust to your backend route or remove if not needed
      await api.post("/support/tickets", {
        name: form.name,
        email: form.email,
        phone_code: form.dialCode,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
        source: "web",
      });
      setMsg({ ok: "Your request has been submitted. We’ll get back to you soon.", err: "" });
      setForm((f) => ({ ...f, subject: "", message: "" }));
    } catch (e) {
      setMsg({ ok: "", err: e?.response?.data?.message || "Could not submit your request." });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(SUPPORT_WHATSAPP);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  }

  return (
    <div className=" min-h-screen text-white">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-14">
        <div className="bg-[#1A2130] border border-[#2A3245] rounded-2xl overflow-hidden">
          {/* Top bar */}
          <div className="bg-[#0B1B7F] px-5 py-4 flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-extrabold">Support</h1>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 lg:px-10 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Contact form */}
            <section className="lg:col-span-2">
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field>
                    <Label>Country code</Label>
                    <Select
                      value={form.dialCode}
                      onChange={(e) => update("dialCode", e.target.value)}
                    >
                      {DIAL_CODES.map((d) => (
                        <option key={d.cc + d.code} value={d.code}>
                          {d.code}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="col-span-2">
                    <Field>
                      <Label>Contact number</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="Contact number"
                      />
                    </Field>
                  </div>
                </div>

                <Field>
                  <Label>Subject (optional)</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    placeholder="e.g. Verification help"
                  />
                </Field>

                <Field>
                  <Label>Message</Label>
                  <TextArea
                    rows={5}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Tell us how we can help…"
                  />
                </Field>

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

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit Request"}
                  </Button>
                </div>
              </form>
            </section>

            {/* Right: Contact info card */}
            <aside>
              <div className="bg-[#121829] border border-[#2A3245] rounded-xl p-4">
                <h3 className="font-semibold mb-2">Contact options</h3>
                <p className="text-sm text-gray-300">
                  You can create a ticket or contact us on WhatsApp. We usually
                  reply within a few minutes during business hours.
                </p>

                <div className="mt-4 text-sm">
                  <div className="text-gray-400">WhatsApp</div>
                  <div className="font-medium mt-1">{SUPPORT_WHATSAPP}</div>
                </div>

                <div className="mt-4 text-sm">
                  <div className="text-gray-400">Support hours</div>
                  <div className="font-medium mt-1">
                    Mon–Sat, 9:00–18:00 (IST)
                  </div>
                </div>

                <div className="mt-4 text-sm">
                  <div className="text-gray-400">Email</div>
                  <div className="font-medium mt-1">
                    <a
                      href={`mailto:support@royalfxs.com`}
                      className="underline hover:no-underline"
                    >
                      support@royalfxs.com
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- UI atoms (dark theme) ---------- */
function Field({ children }) { return <div className="space-y-1">{children}</div>; }
function Label({ children }) { return <label className="block text-sm text-gray-300">{children}</label>; }
function Input(props) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${props.className || ""}`}
    />
  );
}
function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md bg-[#121829] border border-[#2A3245] px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${props.className || ""}`}
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-md bg-[#121829] border border-[#2A3245] px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${props.className || ""}`}
    />
  );
}
function Button({ children, ...rest }) {
  return (
    <button {...rest} className="bg-[#0B1B7F] hover:brightness-110 px-6 py-2.5 rounded-md font-semibold shadow disabled:opacity-60">
      {children}
    </button>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor">
      <path d="M19.1 17.4c-.3-.1-1-.5-1.1-.6-.2-.1-.4-.1-.5.1-.2.3-.5.6-.6.7-.1.1-.2.1-.5 0-.3-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.3 0-.4.1-.6.1-.1.3-.4.4-.5.1-.2.1-.3 0-.5l-.6-1.5c-.1-.4-.3-.4-.5-.4H10c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.5 4.7 2.6 1.1 3.2 1.1 3.8 1 .6-.1 1.9-.8 2.1-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.6-.3z" />
      <path d="M16 3C9.9 3 5 7.9 5 14c0 2.2.6 4.2 1.7 6L5 27l7.2-1.9c1.7.9 3.6 1.4 5.8 1.4 6.1 0 11-4.9 11-11S22.1 3 16 3zm0 20.2c-1.9 0-3.7-.5-5.2-1.4l-.4-.2-4.3 1.1 1.1-4.2-.2-.4c-1-1.6-1.5-3.5-1.5-5.3C5.5 8.5 10.2 3.8 16 3.8S26.5 8.5 26.5 14.3 21.8 23.2 16 23.2z" />
    </svg>
  );
}
