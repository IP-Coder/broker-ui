import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
export default function Login() {
  const navigate = useNavigate();

  // which view?
  const [mode, setMode] = useState("login"); // 'login' | 'signup'

  // NEW: which signup type?
  const [accountType, setAccountType] = useState("demo"); // 'demo' | 'live'

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPwd, setLoginShowPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState("");

  // signup state
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPwd, setSignupShowPwd] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupError, setSignupError] = useState("");

  // Referral
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [refCode, setRefCode] = useState("");
  useEffect(() => {
    const path = (location.pathname || "").toLowerCase();
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
    if (path.includes("/register") || ref) {
      setMode("signup");
    }
  }, [location.pathname, location.search, searchParams]);
  // ---- handlers ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    setLoginSuccess(false);
    try {
      const { data } = await api.post("/login", {
        email: loginEmail,
        password: loginPassword,
      });
      if (data?.token) {
        localStorage.setItem("token", data.token);
        setLoginSuccess(true);
        setTimeout(() => navigate("/dashboard"), 650);
      } else {
        throw new Error("No token");
      }
    } catch (err) {
      setLoginError("Invalid credentials. Please try again.");
    } finally {
      setTimeout(() => setLoginLoading(false), 250);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    setSignupSuccess(false);
    try {
      const { data } = await api.post("/signup", {
        name,
        email: signupEmail,
        password: signupPassword,
        password_confirmation: signupPassword,
        account_type: accountType, // 'demo' | 'live'
        referral_code: refCode || undefined,
      });

      if (data?.token) {
        // if your API returns token on signup
        localStorage.setItem("token", data.token);
        setSignupSuccess(true);
        setTimeout(() => navigate("/dashboard"), 650);
      } else {
        // otherwise just show success and switch to login
        setSignupSuccess(true);
        setTimeout(() => {
          setMode("login");
          setSignupSuccess(false);
        }, 1000);
      }
    } catch (err) {
      setSignupError(
        err?.response?.data?.message || "Sign up failed. Please try again."
      );
    } finally {
      setTimeout(() => setSignupLoading(false), 250);
    }
  };

  // inline icons (no external CSS)
  const Eye = ({ slash = false }) =>
    slash ? (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M3.11 9a10.64 10.64 0 0017.78 0M20.89 15a10.64 10.64 0 01-3.1 2.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ) : (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );

  const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" width="20" height="20">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.8 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.1-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.8 16.5 19 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 15.4 4 8.2 8.9 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.1 35.5 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C8.1 38.8 15.5 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-5.2 0-9.7-3.3-11.3-8l-6.5 5C8.1 38.8 15.5 44 24 44c11.1 0 20-8.9 20-20 0-1.2-.1-2.1-.4-3.5z"
      />
    </svg>
  );
  const AppleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.01-.9.96-2.36 1.7-3.59 1.6-.11-1.06.49-2.2 1.22-2.96.9-.97 2.5-1.7 3.57-1.65zM20.74 17.18c-.68 1.57-1.01 2.24-1.89 3.6-1.22 1.86-2.94 4.18-5.07 4.18-1.16 0-1.96-.77-3.26-.77-1.33 0-2.18.77-3.34.77-2.12 0-3.76-2.1-4.98-3.96C.7 18.3-.2 15.18.12 12.24c.28-2.4 1.9-4.57 4.12-4.57 1.2 0 2.22.84 2.96.84.7 0 1.98-.86 3.46-.86 1.06 0 2.56.46 3.5 1.77-.09.05-2.25 1.31-2.23 3.9.02 3.11 2.72 4.14 2.77 4.16-.03.08-.28.98-.96 2.7z" />
    </svg>
  );
  const MetaIcon = () => (
    <svg
      viewBox="0 0 64 64"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M10 41c6-14 16-22 24 0 8-22 18-14 20 0" />
    </svg>
  );

  return (
    <div className="page-pad">
      <style>{styles}</style>

      {/* background shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
      </div>

      {/* brand */}
      <div className="company-brand">RoyalsFX</div>

      {/* card */}
      <div className="auth-container">
        <div className="auth-header">
          {mode === "login" ? (
            <>
              <h1>Welcome to RoyalsFX</h1>
              <p>Access your premium trading dashboard</p>
            </>
          ) : (
            <>
              <h1>Join RoyalsFX</h1>
              <p>Begin your trading journey with confidence</p>

              {/* signup tabs */}
              <div
                className="signup-tabs"
                role="tablist"
                aria-label="Account type"
              >
                <button
                  role="tab"
                  aria-selected={accountType === "demo"}
                  className={`signup-tab ${
                    accountType === "demo" ? "active" : ""
                  }`}
                  onClick={() => setAccountType("demo")}
                  type="button"
                >
                  Demo Account
                </button>
                <button
                  role="tab"
                  aria-selected={accountType === "live"}
                  className={`signup-tab ${
                    accountType === "live" ? "active" : ""
                  }`}
                  onClick={() => setAccountType("live")}
                  type="button"
                >
                  Live Account
                </button>
              </div>

              <div className="tab-hint">
                {accountType === "demo"
                  ? "Practice with virtual funds (no real money)."
                  : "Real trading. KYC & funding required."}
              </div>
            </>
          )}
        </div>

        {(mode === "login" ? loginError : signupError) && (
          <div className="error-banner" role="alert">
            {mode === "login" ? loginError : signupError}
          </div>
        )}

        {mode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin} autoComplete="off">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loginLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type={loginShowPwd ? "text" : "password"}
                placeholder="••••••••"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loginLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setLoginShowPwd((s) => !s)}
                aria-label={loginShowPwd ? "Hide password" : "Show password"}
                title={loginShowPwd ? "Hide password" : "Show password"}
              >
                <Eye slash={loginShowPwd} />
              </button>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <div className="loading" aria-label="Loading" />
              ) : loginSuccess ? (
                <>
                  <span>Login Successful</span>
                  <svg className="checkmark" viewBox="0 0 24 24">
                    <path fill="none" d="M4.1 12.7L9 17.6 20.3 6.3" />
                  </svg>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>

            <div className="social-login" aria-hidden={loginLoading}>
              <button
                type="button"
                className="social-btn"
                title="Login with Google"
              >
                <GoogleIcon />
              </button>
              <button
                type="button"
                className="social-btn"
                title="Login with Apple"
              >
                <AppleIcon />
              </button>
              <button
                type="button"
                className="social-btn"
                title="Login with Meta"
              >
                <MetaIcon />
              </button>
            </div>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleSignup}
            autoComplete="off"
          >
            <div className="form-group">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={signupLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                required
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                disabled={signupLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type={signupShowPwd ? "text" : "password"}
                placeholder="••••••••"
                required
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                disabled={signupLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setSignupShowPwd((s) => !s)}
                aria-label={signupShowPwd ? "Hide password" : "Show password"}
                title={signupShowPwd ? "Hide password" : "Show password"}
              >
                <Eye slash={signupShowPwd} />
              </button>
              {/* Password rules helper */}
              <ul className="pwd-hints" aria-live="polite">
                <li className={signupPassword.length >= 8 ? "ok" : ""}>
                  • At least 8 characters
                </li>
              </ul>
            </div>

            <div className="terms-group">
              <input type="checkbox" id="terms-agree" required />
              <label htmlFor="terms-agree" className="terms-text">
                I agree to the <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>. I confirm I am at least 18 years
                old.
              </label>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={signupLoading || signupPassword.length < 8}
            >
              {signupLoading ? (
                <div className="loading" aria-label="Loading" />
              ) : signupSuccess ? (
                <>
                  <span>Account Created</span>
                  <svg className="checkmark" viewBox="0 0 24 24">
                    <path fill="none" d="M4.1 12.7L9 17.6 20.3 6.3" />
                  </svg>
                </>
              ) : (
                <span>Start Trading</span>
              )}
            </button>

            <div className="social-login" aria-hidden={signupLoading}>
              <button
                type="button"
                className="social-btn"
                title="Sign up with Google"
              >
                <GoogleIcon />
              </button>
              <button
                type="button"
                className="social-btn"
                title="Sign up with Apple"
              >
                <AppleIcon />
              </button>
              <button
                type="button"
                className="social-btn"
                title="Sign up with Meta"
              >
                <MetaIcon />
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          {mode === "login" ? (
            <>
              New to RoyalsFX?{" "}
              <button
                className="auth-link"
                onClick={() => setMode("signup")}
                type="button"
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="auth-link"
                onClick={() => setMode("login")}
                type="button"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------ Styles ------------------ */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --primary-bg: #0d1117;
  --secondary-bg: #161b22;
  --card-bg: rgba(22, 27, 34, 0.95);
  --accent-blue: #58a6ff;
  --accent-gold: #FFD700;
  --accent-blue-light: rgba(88, 166, 255, 0.1);
  --accent-blue-hover: #388bfd;
  --text-primary: #f0f6fc;
  --text-secondary: #8b949e;
  --input-bg: #0d1117;
  --input-border: #30363d;
  --input-focus: #58a6ff;
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --border-radius: 12px;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

html, body, #root { height: 100%; }
body { margin: 0; padding: 0; }
.page-pad {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background-color: var(--primary-bg);
  color: var(--text-primary);
  background-image:
    radial-gradient(circle at 25% 25%, rgba(88, 166, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
    url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2IiBoZWlnaHQ9IjYiPgo8cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjMTAxMzE5Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDZMNiAwWk03IC0xTC0xIDdNNSA2TDYgNVotMSAxTDEgLTFaIiBzdHJva2U9IiMxNzFkMjgiIHN0cm9rZS13aWR0aD0iMC41Ij48L3BhdGg+Cjwvc3ZnPg==');
  line-height: 1.5;
  overflow-x: hidden;
}

.floating-shapes { position: fixed; inset: 0; pointer-events: none; z-index: -1; }
.shape { position: absolute; opacity: 0.1; border-radius: 50%; filter: blur(40px); }
.shape-1 { width: 300px; height: 300px; background: var(--accent-blue); top: 10%; left: 5%; animation: float 15s ease-in-out infinite; }
.shape-2 { width: 400px; height: 400px; background: var(--accent-gold); bottom: 10%; right: 5%; animation: float 18s ease-in-out infinite reverse; }
@keyframes float { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,50px)} }

.company-brand {
  position: fixed; top: 20px; left: 20px;
  font-weight: 700; font-size: 20px;
  background: linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-gold) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  display:flex; align-items:center; gap:8px;
}
.company-brand::before{
  content:''; width:24px; height:24px; display:inline-block;
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-gold) 100%);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L18 9v6l-6 3.5-6-3.5V9l6-3.5z'/%3E%3C/svg%3E") no-repeat center;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L18 9v6l-6 3.5-6-3.5V9l6-3.5z'/%3E%3C/svg%3E") no-repeat center;
}

.auth-container {
  background: var(--card-bg);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  width: 100%; max-width: 440px; padding: 48px;
  transition: var(--transition);
  border: 1px solid rgba(240, 246, 252, 0.1);
  animation: fadeIn 0.5s ease-out;
  position: relative; overflow: hidden; z-index: 1;
}
.auth-container::before {
  content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%;
  background: radial-gradient(circle, rgba(88, 166, 255, 0.05) 0%, transparent 70%);
  z-index:-1; animation: rotate 60s linear infinite;
}
@keyframes rotate { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
@keyframes fadeIn { from{opacity:0; transform:translateY(20px)} to{opacity:1; transform:translateY(0)} }

.auth-header { text-align:center; margin-bottom: 24px; position: relative; }
.auth-header h1 {
  font-size: 28px; font-weight: 600; margin-bottom: 8px;
  background: linear-gradient(90deg, #f0f6fc 0%, var(--accent-blue) 50%, var(--accent-gold) 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  background-size:200% auto; animation: gradient 3s ease infinite;
}
@keyframes gradient { 0%{background-position:0% center} 50%{background-position:100% center} 100%{background-position:0% center} }
.auth-header p { color: var(--text-secondary); font-size: 15px; }

/* signup tabs */
.signup-tabs { display:flex; gap:8px; justify-content:center; margin-top:14px; }
.signup-tab {
  padding:10px 14px; border-radius:8px; border:1px solid var(--input-border);
  background: var(--secondary-bg); color: var(--text-secondary); cursor:pointer;
  transition: var(--transition); font-weight:600; font-size:14px;
}
.signup-tab.active { color: var(--text-primary); border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(88,166,255,0.15); }
.signup-tab:hover { border-color: var(--accent-blue); color: var(--text-primary); }
.tab-hint { text-align:center; color:var(--text-secondary); margin-top:8px; font-size:12px; }

.auth-form { display:flex; flex-direction:column; gap:24px; }
.form-group { display:flex; flex-direction:column; gap:8px; position:relative; }
.form-group label { font-size:14px; font-weight:500; color:var(--text-secondary); transition:var(--transition); }
.form-group input {
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 14px 16px;
  color: var(--text-primary);
  font-size: 15px;
  transition: var(--transition);
  height: 48px;
}
.form-group input::placeholder { color: var(--text-secondary); opacity:.6; }
.form-group input:focus { outline:none; border-color: var(--input-focus); box-shadow: 0 0 0 3px rgba(88,166,255,0.15); }
.form-group input:hover { border-color: var(--accent-blue); }

.password-toggle {
  position:absolute; right:16px; top:38px;
  cursor:pointer; color:var(--text-secondary); transition:var(--transition);
  background:transparent; border:0; padding:4px;
}
.password-toggle:hover { color: var(--accent-gold); }

.error-banner {
  margin-bottom: 16px; padding: 12px 14px; border-radius: 8px;
  background: rgba(255, 77, 79, 0.12); color: #ff7b82; border: 1px solid rgba(255, 77, 79, 0.35);
}

.auth-button {
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-gold) 100%);
  color:#fff; border:none; border-radius:8px; padding:16px;
  font-size:16px; font-weight:600; cursor:pointer; transition: var(--transition);
  margin-top:8px; display:flex; align-items:center; justify-content:center; gap:8px; height:48px;
  position:relative; overflow:hidden; z-index:1;
}
.auth-button::before { content:''; position:absolute; inset:0; background: linear-gradient(135deg, var(--accent-blue-hover) 0%, #FFC600 100%); opacity:0; transition:var(--transition); z-index:-1; }
.auth-button:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(88,166,255,0.3); }
.auth-button:hover::before { opacity: 1; }
.auth-button:active { transform: translateY(0); }
.auth-button:disabled { opacity:.7; cursor:not-allowed; transform:none; box-shadow:none; }

.social-login { display:flex; justify-content:center; gap:16px; margin-top:16px; }
.social-btn {
  width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background: var(--secondary-bg); color: var(--text-primary); transition: var(--transition);
  border: 1px solid var(--input-border);
}
.social-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); color: var(--accent-blue); border-color: var(--accent-blue); }

.auth-footer { text-align:center; margin-top:28px; font-size:14px; color: var(--text-secondary); }
.auth-link {
  color: var(--accent-blue); text-decoration:none; font-weight:500; transition: var(--transition);
  position: relative; background:none; border:none; cursor:pointer;
}
.auth-link:hover { color: var(--accent-gold); }
.auth-link::after {
  content:''; position:absolute; width:100%; height:1px; bottom:-2px; left:0;
  background: linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-gold) 100%);
  transform: scaleX(0); transform-origin: right; transition: transform .3s ease;
}
.auth-link:hover::after { transform: scaleX(1); transform-origin: left; }

/* loader + success */
@keyframes spin { 0% { transform: rotate(0deg)} 100% { transform: rotate(360deg)} }
.loading { display:inline-block; width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-radius:50%; border-top-color:#fff; animation: spin .8s ease-in-out infinite; }
@keyframes checkmark { 0%{ stroke-dashoffset:50 } 100%{ stroke-dashoffset:0 } }
.checkmark { width:18px; height:18px; stroke:#fff; stroke-width:3; stroke-dasharray:50; stroke-dashoffset:50; animation: checkmark .5s ease-in-out forwards; }

/* password hints */
.pwd-hints { margin: 4px 0 0; padding-left: 0; list-style: none; font-size: 12px; color: var(--text-secondary); }
.pwd-hints li.ok { color: #3fb950; }

/* responsive */
@media (max-width: 480px) {
  .auth-container { padding: 32px 24px; }
  .auth-header h1 { font-size: 24px; }
}

/* Terms checkbox */
.terms-group { display:flex; align-items:flex-start; gap:12px; margin-top:8px; }
.terms-group input[type="checkbox"] {
  appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border: 1px solid var(--input-border);
  border-radius: 4px; cursor: pointer; position: relative; flex-shrink: 0; margin-top: 2px; transition: var(--transition);
}
.terms-group input[type="checkbox"]:checked { background-color: var(--accent-blue); border-color: var(--accent-blue); }
.terms-group input[type="checkbox"]:checked::after {
  content: '\\2713'; position: absolute; color: white; font-size: 12px; top: 50%; left: 50%; transform: translate(-50%, -50%);
}
.terms-text { font-size: 13px; color: var(--text-secondary); }
.terms-text a { color: var(--accent-blue); text-decoration: none; transition: var(--transition); }
.terms-text a:hover { color: var(--accent-gold); text-decoration: underline; }
`;