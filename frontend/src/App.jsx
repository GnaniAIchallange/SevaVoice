import { useState } from "react";
import Admin from "./pages/Admin.jsx";
import Verifier from "./pages/Verifier.jsx";
import Donor from "./pages/Donor.jsx";
import Farmer from "./pages/Farmer.jsx";
import DonorRegister from "./pages/DonorRegister.jsx";

import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ROLE_PAGES = {
  admin: Admin,
  verifier: Verifier,
  donor: Donor,
  farmer: Farmer,
};

function readSavedUser() {
  try {
    return (
      JSON.parse(sessionStorage.getItem("seva-auth") || "null")?.user ?? null
    );
  } catch {
    return null;
  }
}

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(readSavedUser);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to sign in");
      }

      sessionStorage.setItem(
        "seva-auth",
        JSON.stringify({ token: result.token, user: result.user }),
      );
      setUser(result.user);
      setPassword("");
    } catch (loginError) {
      setError(loginError.message || "Could not connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRegistered(result) {
    sessionStorage.setItem(
      "seva-auth",
      JSON.stringify({ token: result.token, user: result.user }),
    );
    setUser(result.user);
    setPassword("");
    setShowLogin(false);
  }

  function handleLogout() {
    sessionStorage.removeItem("seva-auth");
    setUser(null);
    setPhone("");
    setPassword("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setShowLogin(false)}>
          SevaVoice
        </a>
        <nav aria-label="Main navigation">
          {user ? (
            <button className="login-link" type="button" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <button
              className="login-link"
              type="button"
              onClick={() => {
                setShowLogin(true);
                setAuthMode("login");
                setError("");
              }}
            >
              Login
            </button>
          )}
        </nav>
      </header>

      <main>
        {user ? (
          (() => {
            const RolePage = ROLE_PAGES[user.role];
            return RolePage ? (
              <RolePage user={user} onLogout={handleLogout} />
            ) : (
              <section className="login-panel">
                <h1>Account role not recognized</h1>
                <button
                  className="submit-button"
                  type="button"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </section>
            );
          })()
        ) : showLogin && authMode === "register" ? (
          <DonorRegister
            onBack={() => setShowLogin(false)}
            onLogin={() => {
              setAuthMode("login");
              setError("");
            }}
            onRegistered={handleRegistered}
          />
        ) : showLogin ? (
          <section className="login-panel" aria-labelledby="login-title">
            <button
              className="back-link"
              type="button"
              onClick={() => setShowLogin(false)}
            >
              Back
            </button>

            <p className="eyebrow">SevaVoice account</p>
            <h1 id="login-title">Login</h1>
            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="phone">Phone number</label>
              <input
                autoComplete="tel"
                id="phone"
                name="phone"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter your phone number"
                required
                type="tel"
                value={phone}
              />

              <label htmlFor="password">Password</label>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type="password"
                value={password}
              />

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="submit-button"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
            <button
              className="auth-switch"
              type="button"
              onClick={() => {
                setAuthMode("register");
                setError("");
              }}
            >
              Create a donor account
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
