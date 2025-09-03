import { useEffect, useRef } from "react";

export function Toast({
  open,
  onClose,
  title = "Trade Placed!",
  description = "",
  duration = 4000, // ms
  type = "success", // "success" | "info" | "error"
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    timerRef.current = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timerRef.current);
  }, [open, duration, onClose]);

  if (!open) return null;

  const ring =
    type === "success"
      ? "ring-green-200"
      : type === "error"
      ? "ring-red-200"
      : "ring-gray-200";

  const badge =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-gray-600";

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-[1100] flex items-start justify-end px-4 py-6 sm:p-6"
    >
      <div
        className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl bg-white text-black shadow-lg ring-1 ${ring} transform transition-all duration-300 translate-y-0 opacity-100`}
        role="status"
      >
        <div className="p-4">
          <div className="flex items-start">
            <span className={`mt-1 h-2 w-2 rounded-full ${badge}`} />
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold">{title}</p>
              {description ? (
                <p className="mt-1 text-sm text-gray-700">{description}</p>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="ml-3 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
