// Dashboard.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TradePanel from "../components/TradePanel";
import ChartPanel from "../components/ChartPanel";
import Header from "../components/Header";
import Footer from "../components/Footer";
import MobileDashboard from "../components/MobileDashboard";
import { useMobile } from "../hooks/useMobile";
import "../styles/mobile-dashboard.css";

export default function Dashboard({ isDemo, setIsDemo }) {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [ohlcData, setOhlcData] = useState([]);
  const [user, setUser] = useState(null);
  const [reloadOpen, setReloadOpen] = useState(0);
  const [showTradePanel, setShowTradePanel] = useState(true); // ✅ Toggle state
  const isMobile = useMobile();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setUser({ token });
  }, []);

  useEffect(() => {
    fetch(
      `http://localhost/PaperTrade/Broker/public/api/ohlc?symbol=${selectedSymbol}&periods=30&interval=3600`
    )
      .then((res) => res.json())
      .then((res) => setOhlcData(res.data || []));
  }, [selectedSymbol]);

  if (isMobile) {
    return <MobileDashboard />;
  }

  return (
    <div className="bg-[#181C23] min-h-screen h-screen flex flex-col">
      <Header isDemo={isDemo} setIsDemo={setIsDemo} />

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <div className="basis-[25%] flex-shrink-0 max-w-[30vw] h-full overflow-y-auto">
          <Sidebar
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            user={user}
          />
        </div>

        {/* TradePanel (conditionally render) */}
        {showTradePanel && (
          <div className="basis-[20%] flex-shrink-0 h-full">
            <TradePanel
              symbol={selectedSymbol}
              user={user}
              onTradeSuccess={() => setReloadOpen((r) => r + 1)}
              onClose={() => setShowTradePanel(false)} // ✅ नया prop
            />
          </div>
        )}

        {/* ChartPanel expand when trade panel is hidden */}
        <div className="flex-1 flex flex-col bg-[#222833] h-full overflow-hidden relative">
          {/* Chart */}
          <div className="p-4 flex-1">
            <ChartPanel symbol={selectedSymbol} ohlcData={ohlcData} />
          </div>

          {/* Show “Open Trade” button when TradePanel is hidden */}
          {!showTradePanel && (
            <button
              onClick={() => setShowTradePanel(true)}
              className="absolute top-4 right-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition z-10"
            >
              Open Trade
            </button>
          )}
        </div>
      </div>

      <Footer reloadTrigger={reloadOpen} />
    </div>
  );
}
