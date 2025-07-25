// src/components/Header.jsx
export default function Header() {
  return (
    <header className="bg-[#23272F] flex items-center justify-between px-6 h-16 shadow-md">
      <div className="flex items-center gap-3">
       
        <span className="text-lg font-bold text-white">BullMarkets</span>
        {/* Language selector, icons... */}
        <button className="ml-4 text-gray-300 hover:text-white text-xl">🌐</button>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-blue-400 font-bold px-4 py-1 rounded bg-blue-950 text-sm">DEMO</span>
        <span className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center text-xl text-white font-bold">P</span>
        <a href="#" className="text-blue-600 font-medium">Banking</a>
        <button className="bg-green-400 hover:bg-green-500 text-white font-bold px-5 py-2 rounded-lg ml-2">Deposit</button>
      </div>
    </header>
  );
}
