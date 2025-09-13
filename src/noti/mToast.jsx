// src/noti/Toast.jsx
import React, { useEffect, useRef } from "react";

export function mToast({
  open = false,
  onOpenChange,
  title = "",
  description = "",
  type = "info", // "success" | "error" | "warning" | "info"
  duration = 4500, // auto-close ms (set null/0 to disable)
  closable = true,
}) {
  const timerRef = useRef(null);

  // Auto-dismiss
  useEffect(() => {
    if (!open || !duration) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onOpenChange?.(false);
    }, duration);
    return () => clearTimeout(timerRef.current);
  }, [open, duration, onOpenChange]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onOpenChange?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div style={styles.wrap} role="alert" aria-live="polite">
      <div style={{ ...styles.box, ...typeStyle(type) }}>
        <div style={styles.header}>
          <strong>{title}</strong>
          {closable && (
            <button
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChange?.(false);
              }}
              style={styles.close}
            >
              ×
            </button>
          )}
        </div>
        {description ? <div style={styles.desc}>{description}</div> : null}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    left: "50%",
    bottom: 20,
    transform: "translateX(-50%)",
    zIndex: 9999,
    padding: 8,
  },
  box: {
    minWidth: 260,
    maxWidth: 420,
    borderRadius: 10,
    padding: "12px 14px",
    boxShadow: "0 10px 24px rgba(0,0,0,.35)",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
    fontWeight: 700,
  },
  close: {
    background: "transparent",
    border: "none",
    color: "inherit",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
  },
  desc: {
    opacity: 0.95,
    fontSize: 14,
    lineHeight: 1.4,
  },
};

function typeStyle(type) {
  switch (type) {
    case "success":
      return { background: "#16a34a" };
    case "error":
      return { background: "#dc2626" };
    case "warning":
      return { background: "#f59e0b", color: "#111827" };
    default:
      return { background: "#374151" };
  }
}
