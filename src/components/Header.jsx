import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../api/axios"; // <-- added to fetch /me (same as UserProfile)

export default function Header() {
  const navigate = useNavigate();

  // UI state
  const [openLang, setOpenLang] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [openBanking, setOpenBanking] = useState(false);
  const [openMore, setOpenMore] = useState(false);

  const langRef = useRef(null);
  const userRef = useRef(null);
  const bankingRef = useRef(null);
  const moreRef = useRef(null);

  // NEW: user state
  const [user, setUser] = useState(null);

  // click-outside to close menus
  useEffect(() => {
    function onDocClick(e) {
      if (langRef.current && !langRef.current.contains(e.target))
        setOpenLang(false);
      if (userRef.current && !userRef.current.contains(e.target))
        setOpenUser(false);
      if (bankingRef.current && !bankingRef.current.contains(e.target))
        setOpenBanking(false);
      if (moreRef.current && !moreRef.current.contains(e.target))
        setOpenMore(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // NEW: Fetch /me to get account_type and name/first_name
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        setUser(res.data || null);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    })();
  }, []);

  // actions
  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement) d.documentElement.requestFullscreen?.();
    else d.exitFullscreen?.();
  }

  // --- derived display fields ---
  const accountTypeRaw = (user?.account_type || user?.accountType || "")
    .toString()
    .toLowerCase();
  const accountTypeLabel =
    accountTypeRaw === "live"
      ? "LIVE"
      : accountTypeRaw === "demo"
      ? "DEMO"
      : "DEMO";
 const isDemo = accountTypeRaw !== "live";

 // NEW: handler (UI-only for now)
 async function handleSwitchToLive() {
   const ok = window.confirm(
     "Switch to Live Account?\n\n" +
       "• ALL your demo trades will be permanently deleted.\n" +
       "• Your trading account will be reset to 0 (balance, equity, used margin).\n" +
       "• This cannot be undone.\n\n" +
       "Do you want to continue?"
   );
   if (!ok) return;

   try {
     await api.post("/user/switch-to-live");
     // re-fetch /me to refresh header labels
     const me = await api.get("/me");
     setUser(me.data || null);
     setOpenUser(false);
     alert(
       "Success! You are now on LIVE. Demo trades deleted and account reset."
     );
   } catch (e) {
     console.error(e);
     alert(e?.response?.data?.message || "Failed to switch. Please try again.");
   }
 }
 const avatarInitial = (
   user?.first_name?.trim()?.[0] ||
   user?.name?.trim()?.[0] ||
   user?.username?.trim()?.[0] ||
   user?.email?.trim()?.[0] ||
   "U"
 ).toUpperCase();

 const brand = (
   <button
     onClick={() => navigate("/dashboard")}
     className="flex items-center gap-2"
     aria-label="BullMarkets home"
   >
     <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500">
       <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
         <path d="M4 18L12 4l8 14H4z" fill="currentColor" />
       </svg>
     </span>
     <span className="text-xl font-extrabold tracking-tight text-[#0B1B7F]">
       RoyalFx
     </span>
   </button>
 );

 const toolIconBtn = (props) => (
   <button
     {...props}
     className={`p-2 rounded hover:bg-gray-100 text-[#0B1B7F] ${
       props.className || ""
     }`}
   />
 );

 return (
   <header className="sticky top-0 z-40 bg-white border-t border-gray-800 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
     <div className=" px-3 sm:px-4">
       <div className="h-14 flex items-center justify-between gap-3">
         {/* Left cluster */}
         <div className="flex items-center gap-3 sm:gap-4">
           {/* Mobile "more" */}
           <div className="md:hidden relative" ref={moreRef}>
             <button
               onClick={() => setOpenMore((v) => !v)}
               className="p-2 rounded hover:bg-gray-100 text-[#0B1B7F]"
               aria-label="More"
               aria-haspopup="menu"
               aria-expanded={openMore}
             >
               <svg viewBox="0 0 24 24" className="w-6 h-6">
                 <rect x="3" y="6" width="18" height="2" rx="1" />
                 <rect x="3" y="11" width="18" height="2" rx="1" />
                 <rect x="3" y="16" width="18" height="2" rx="1" />
               </svg>
             </button>
             {openMore && (
               <div className="absolute left-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                 <div className="px-3 pt-2 pb-1 text-xs text-gray-600">
                   Account Type
                 </div>
                 <div className="px-3 pb-2 text-xs font-extrabold text-[#0B1B7F] tracking-wider">
                   {accountTypeLabel}
                 </div>
                 <div className="border-t my-1"></div>
                 <Link
                   to="/support"
                   className="block px-3 py-2 text-[#0B1B7F] hover:bg-gray-50"
                 >
                   Support
                 </Link>
                 <div className="border-t my-1"></div>
                 <div className="px-3 py-2 text-xs text-gray-500">Account</div>
                 {isDemo && (
                   <button
                     onClick={handleSwitchToLive}
                     className="w-full text-left px-3 py-2 mb-1 rounded border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50"
                   >
                     Switch to Live Account
                   </button>
                 )}
                 <Link
                   to="/profile"
                   className="block px-3 py-2 text-[#000000] hover:bg-gray-50"
                 >
                   Profile
                 </Link>
                 <Link
                   to="/withdrawal"
                   className="block px-3 py-2 text-[#000000] hover:bg-gray-50"
                 >
                   Withdrawal
                 </Link>
                 <button
                   onClick={handleLogout}
                   className="w-full text-left px-3 py-2 text-[#000000] hover:bg-gray-50"
                 >
                   Logout
                 </button>
               </div>
             )}
           </div>
           {brand}

           {/* Desktop tools */}
           <div className="hidden md:flex items-center gap-2">
             {/* Fullscreen */}
             {toolIconBtn({
               onClick: toggleFullscreen,
               title: "Fullscreen",
               children: (
                 <svg viewBox="0 0 24 24" className="w-5 h-5">
                   <path
                     d="M7 3H3v4M21 7V3h-4M3 17v4h4M17 21h4v-4"
                     stroke="currentColor"
                     strokeWidth="2"
                     fill="none"
                     strokeLinecap="round"
                   />
                 </svg>
               ),
             })}

             {/* Support */}
             <Link
               to="/support"
               title="Support"
               className="p-2 rounded hover:bg-gray-100 text-[#0B1B7F]"
             >
               <svg viewBox="0 0 24 24" className="w-5 h-5">
                 <path
                   d="M4 12a8 8 0 0116 0v5a3 3 0 01-3 3h-3"
                   stroke="currentColor"
                   strokeWidth="2"
                   fill="none"
                 />
                 <path
                   d="M4 12v5a3 3 0 003 3h2v-5H7"
                   stroke="currentColor"
                   strokeWidth="2"
                   fill="none"
                 />
               </svg>
             </Link>

             {/* Account type badge (LIVE/DEMO) */}
             <span className="text-xs font-extrabold text-[#0B1B7F] tracking-wider select-none">
               {accountTypeLabel}
             </span>

             {/* Avatar + menu */}
             <div className="relative" ref={userRef}>
               <button
                 onClick={() => setOpenUser((v) => !v)}
                 className="flex items-center gap-1"
                 aria-haspopup="menu"
                 aria-expanded={openUser}
               >
                 <span
                   className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-[#0B1B7F] font-bold"
                   aria-label={user?.name || user?.first_name || "User"}
                   title={
                     user?.name || user?.first_name || user?.email || "User"
                   }
                 >
                   {avatarInitial}
                 </span>
                 <svg
                   className="w-3 h-3 text-[#0B1B7F]"
                   viewBox="0 0 20 20"
                   fill="currentColor"
                 >
                   <path
                     d="M5.5 7.5L10 12l4.5-4.5"
                     stroke="currentColor"
                     strokeWidth="2"
                     fill="none"
                   />
                 </svg>
               </button>
               {openUser && (
                 <div className="absolute right-0 mt-2 p-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg">
                   <Link
                     to="/profile"
                     className="block px-3 py-2 text-[#000000] hover:bg-gray-50"
                   >
                     Profile
                   </Link>
                   <button
                     onClick={handleLogout}
                     className="w-full text-left px-3 py-2 text-[#000000] hover:bg-gray-50"
                   >
                     Logout
                   </button>
                   {isDemo && (
                     <button
                       onClick={handleSwitchToLive}
                       className="w-full text-left px-3 py-2 mb-1 rounded border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50"
                     >
                       Switch to Live Account
                     </button>
                   )}
                 </div>
               )}
             </div>
           </div>
         </div>

         {/* Right cluster */}
         <div className="flex items-center gap-4">
           {/* Banking */}
           <div className="relative hidden sm:block" ref={bankingRef}>
             <button
               onClick={() => setOpenBanking((v) => !v)}
               className="text-[#0B1B7F] hover:underline font-medium"
               aria-haspopup="menu"
               aria-expanded={openBanking}
             >
               Banking
             </button>
             {openBanking && (
               <div className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg">
                 <Link
                   to="/deposit"
                   className="block px-3 py-2 text-[#000000] hover:bg-gray-50"
                 >
                   Deposit
                 </Link>
                 <Link
                   to="/withdrawal"
                   className="block px-3 py-2 text-[#000000] hover:bg-gray-50"
                 >
                   Withdrawal
                 </Link>
               </div>
             )}
           </div>

           {/* Deposit */}
           <button
             onClick={() => navigate("/deposit")}
             className="px-4 sm:px-5 py-2 rounded-lg bg-emerald-400 text-[#0B1B7F] font-semibold hover:brightness-95 active:brightness-90"
           >
             Deposit
           </button>
         </div>
       </div>
     </div>
   </header>
 );
}
