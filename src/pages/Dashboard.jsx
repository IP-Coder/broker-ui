// src/components/Dashboard.jsx - Updated with Mobile Support
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

  // Handle trade success callback
  const handleTradeSuccess = (order) => {
    setReloadOpen((prev) => prev + 1);
  };

  // If mobile, render the dedicated mobile dashboard
  if (isMobile) {
    return <MobileDashboard />;
  }

  return (
    <div className="bg-[#181C23] min-h-screen h-screen flex flex-col">
      <Header isDemo={isDemo} setIsDemo={setIsDemo} />
      <div className="flex flex-1 overflow-hidden h-full">
        <div className="basis-[25%] flex-shrink-0 max-w-[30vw] h-full overflow-y-auto">
          <Sidebar
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            user={user}
          />
        </div>
        <div className="basis-[20%]">
          <TradePanel
            symbol={selectedSymbol}
            user={user}
            onTradeSuccess={() => setReloadOpen((r) => r + 1)}
          />
        </div>
        <div className="flex-1 flex flex-col bg-[#222833] h-full overflow-hidden">
          <div className="p-4 flex-1">
            <ChartPanel symbol={selectedSymbol} ohlcData={ohlcData} />
          </div>
        </div>
      </div>
      <Footer reloadTrigger={reloadOpen} />
    </div>
  );
}
