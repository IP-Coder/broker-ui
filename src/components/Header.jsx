import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    localStorage.removeItem("token"); // ya tumhari auth key
    navigate("/login");
  }

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <header className="bg-[#23272F] flex items-center justify-between px-6 h-16 shadow-md">
      {/* Left side */}
      <div className="flex items-center gap-6">
        <span
          className="text-lg font-bold text-white cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          BullMarkets
        </span>

        {/* Navigation */}
        <nav className="flex gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium px-2 py-1 rounded 
                ${
                  location.pathname === item.path
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-300 hover:text-white"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Account Type */}
        <span className="text-blue-400 font-bold px-3 py-1 rounded bg-blue-950 text-xs">
          DEMO
        </span>

        {/* Deposit */}
        <Link
          to="/deposit-withdraw"
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg"
        >
          Deposit
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
