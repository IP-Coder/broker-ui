import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./secure/ProtectedRoute";
import DepositWithdraw from "./pages/DepositWithdraw";
import UserProfile from "./pages/UserProfile";
import ErrorBoundary from "./secure/ErrorBoundary"; // ✅ import
import Deposit from "./pages/Deposit";
import Withdrawal from "./pages/Withdrawal";
import Support from "./pages/Support";
import MobileCoinslist from "./components/MobileCoinslist";
import MobileWallet from "./components/MobileWallet";
import { useMobile } from "./hooks/useMobile";
import UnderConstruction from "./pages/underconstruction";

export default function App() {
  const isAuthenticated = !!localStorage.getItem("token");
  const isMobile = useMobile();

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* Default redirect */}
          <Route
            path="/"
            element={<UnderConstruction />}
          />
          {/* <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to={isMobile ? "/markets" : "/dashboard"} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Protected routes 
          <Route
            path="/markets"
            element={
              <ProtectedRoute>
                <MobileCoinslist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <MobileWallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deposit"
            element={
              <ProtectedRoute>
                <Deposit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/withdrawal"
            element={
              <ProtectedRoute>
                <Withdrawal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            }
          />

          {/* Public routes 
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} /> */}

          {/* Catch all - 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
