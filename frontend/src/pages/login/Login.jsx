import { useState } from "react";
import { ArrowLeft, Lock, LogIn, Phone } from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login({ onNavigate, onAuthenticated }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
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

      setPassword("");
      onAuthenticated(result);
    } catch (loginError) {
      setError(loginError.message || "Could not connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <RouteLink className="back-link inline-flex items-center gap-1.5" to="/" onNavigate={onNavigate}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to home</span>
      </RouteLink>
      <p className="eyebrow">SevaVoice account</p>
      <h1 id="login-title">Login</h1>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="phone" className="flex items-center gap-1.5">
          <Phone size={14} className="text-primary" aria-hidden="true" />
          <span>Phone number</span>
        </label>
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

        <label htmlFor="password" className="flex items-center gap-1.5">
          <Lock size={14} className="text-primary" aria-hidden="true" />
          <span>Password</span>
        </label>
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
          <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger-soft-text text-sm font-semibold mt-1" role="alert">
            {error}
          </div>
        )}

        <button
          className="submit-button inline-flex items-center justify-center gap-2"
          disabled={isSubmitting}
          type="submit"
        >
          <LogIn size={18} aria-hidden="true" />
          <span>{isSubmitting ? "Signing in..." : "Login to account"}</span>
        </button>
      </form>

      <RouteLink
        className="auth-switch text-center"
        to="/register"
        onNavigate={onNavigate}
      >
        Don't have an account? Register here
      </RouteLink>
    </section>
  );
}

export default Login;
