import { useEffect, useRef, useState } from "react";

const TV_SCRIPT_ID = "tradingview-advanced-chart-script";
const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

export default function ChartPanel({
  symbol = "EURUSD",
  interval = "60",
  theme = "dark",
  locale = "en",
  autosize = true,
  toolbarBg = "#181C23",
  containerId = "tv-advanced-chart",
  hide_volume = true,
}) {
  const widgetRef = useRef(null);
  const [isScriptReady, setIsScriptReady] = useState(false);

  // Load TradingView script only once
  useEffect(() => {
    if (document.getElementById(TV_SCRIPT_ID)) {
      setIsScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = TV_SCRIPT_ID;
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.onload = () => setIsScriptReady(true);
    document.head.appendChild(script);

    return () => {
      // script cleanup (optional, usually keep cached)
    };
  }, []);

  // Initialize / reinit widget
  useEffect(() => {
    if (!isScriptReady || !window.TradingView) return;

    // Destroy previous instance
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {
        console.warn("TV widget remove error:", e);
      }
      widgetRef.current = null;
    }

    // Create new widget
    widgetRef.current = new window.TradingView.widget({
      autosize,
      symbol: `OANDA:${symbol}`,
      interval,
      timezone: "exchange",
      theme,
      style: "1",
      locale,
      toolbar_bg: toolbarBg,
      hide_top_toolbar: false,
      withdateranges: true,
      allow_symbol_change: false,
      details: false,
      studies: [],
      container_id: containerId,
      hide_side_toolbar: false,
      hide_volume,
      hide_legend: true,
    });

    // Handle resize
    const onResize = () => widgetRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      try {
        widgetRef.current?.remove();
      } catch (e) {
        console.warn("TV cleanup error:", e);
      }
    };
  }, [
    isScriptReady,
    symbol,
    interval,
    theme,
    locale,
    toolbarBg,
    autosize,
    containerId,
  ]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      <div id={containerId} className="w-full h-full" />
      {!isScriptReady && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          Loading Chart...
        </div>
      )}
    </div>
  );
}
