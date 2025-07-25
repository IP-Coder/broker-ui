// src/components/ChartPanel.jsx
import { useEffect, useRef } from "react";

const TV_SCRIPT_ID = "tradingview-advanced-chart-script";
const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

export default function ChartPanel({
  symbol = "EURUSD", // Pair, without slash
  interval = "60", // Chart interval in minutes
  theme = "dark", // "light" or "dark"
  locale = "en", // Language
  autosize = true, // true → fills container
  toolbarBg = "#f1f3f6", // toolbar background
  containerId = "tv-advanced-chart", // fixed id
}) {
  const widgetRef = useRef(null);

  // 1. Inject the TradingView script if not already on the page
  useEffect(() => {
    if (!document.getElementById(TV_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = TV_SCRIPT_ID;
      script.src = TV_SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // 2. Initialize / re‑init widget when symbol or other config changes
  useEffect(() => {
    // bail if TV global not ready yet
    if (!window.TradingView) return;

    // destroy previous instance
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {
        /* ignore */
      }
      widgetRef.current = null;
    }

    // set up new widget
    widgetRef.current = new window.TradingView.widget({
      autosize,
      symbol: `OANDA:${symbol}`, // e.g. "OANDA:EURUSD"
      interval,
      timezone: "exchange",
      theme,
      style: "1", // candlesticks
      locale,
      toolbar_bg: toolbarBg,
      hide_top_toolbar: false,
      withdateranges: true,
      allow_symbol_change: false, // enforce symbol from props
      details: false,
      studies: [], // add default studies here if desired
      container_id: containerId,
      hide_side_toolbar: false,
    });

    // responsive
    const onResize = () => widgetRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      widgetRef.current?.remove();
    };
  }, [symbol, interval, theme, locale, toolbarBg, autosize, containerId]);

  return (
    <div className="relative w-full h-[100%] bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      <div className="absolute top-4 left-4 z-10 text-white text-xl font-semibold"></div>
      <div id={containerId} className="w-full h-full" />
    </div>
  );
}
