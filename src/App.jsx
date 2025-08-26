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

export default function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* Default redirect */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Protected routes */}
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
            path="/deposit-withdraw"
            element={
              <ProtectedRoute>
                <DepositWithdraw />
              </ProtectedRoute>
            }
          />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Catch all - 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
