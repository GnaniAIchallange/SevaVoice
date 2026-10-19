import { useState } from "react";
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
      <RouteLink className="back-link" to="/" onNavigate={onNavigate}>
        Back
      </RouteLink>
      <p className="eyebrow">SevaVoice account</p>
      <h1 id="login-title">Login</h1>
      <form className="login-form" onSubmit={handleSubmit}>
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
      <RouteLink
        className="auth-switch"
        to="/register"
        onNavigate={onNavigate}
      >
        Register
      </RouteLink>
    </section>
  );
}

export default Login;
