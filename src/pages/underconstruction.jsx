import React from "react";
import { Mail, Clock } from "lucide-react";

// The main component, renamed to App for standard React environment execution
export default function App() {
  // Use Tailwind colors in the gradient for a cleaner look
  const gradientStyle = {
    background:
      "radial-gradient(circle at top, rgba(251, 191, 36, 0.2) 60%, transparent 80%), radial-gradient(circle at bottom, rgba(59, 130, 246, 0.25), #111827)",
  };

  return (
    <div
      // Centering: flex, items-center (vertical), justify-center (horizontal)
      // Height: min-h-screen ensures it fills the entire viewport height
      className="flex items-center justify-center min-h-screen text-white p-4 md:p-8"
      style={gradientStyle}
    >
      {/* Max width container */}
      <div className="w-full max-w-xl">
        <div
          // Card styling: removed border, used shadow-xl, rounded-2xl
          className="bg-gray-800/85 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50"
        >
          <div className="p-6 md:p-10 text-center">
            {/* Tag */}
            <div className="mb-4">
              <span className="inline-block bg-amber-400 text-gray-900 text-xs font-semibold uppercase px-3 py-1.5 rounded-full tracking-wider">
                We'll be back on Monday
              </span>
            </div>

            {/* Brand Title */}
            <h1 className="text-5xl md:text-6xl font-extrabold mb-2">
              <span className="text-amber-400">Royal</span>
              <span className="text-white">FXS</span>
            </h1>
            <p className="text-gray-400 mb-6 font-medium">Premium Forex &amp; Crypto Solutions</p>

            {/* Icon + Message */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="rounded-full border-4 border-amber-500/50 flex items-center justify-center mb-4 p-5">
                <Clock size={48} className="text-amber-400" />
              </div>
              <p className="text-xl text-white mb-2 font-semibold">
                Our new digital experience is almost ready.
              </p>
              <p className="text-gray-400 max-w-md">
                We're polishing the final details to bring you a smarter, more secure trading hub.
              </p>
            </div>

            {/* Contact Button */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <a 
                href="mailto:support@royalfxs.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 text-gray-900 font-bold rounded-full transition duration-300 shadow-lg hover:bg-amber-300 hover:shadow-xl transform hover:scale-[1.02]"
              >
                <Mail size={20} />
                <span>Contact Our Team</span>
              </a>
              <span className="text-gray-500 text-sm">support@royalfxs.com</span>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700 pt-4 mt-6 text-xs text-gray-500">
              &copy; {new Date().getFullYear()} RoyalFXS.com &middot; All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}