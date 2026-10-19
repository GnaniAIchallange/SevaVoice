import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function RegisterDonor({ onBack, onLogin, onRegistered }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    preferredLanguage: "en",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const registration = {
        name: form.name,
        phone: form.phone,
        password: form.password,
        preferredLanguage: form.preferredLanguage,
      };

      if (form.email.trim()) {
        registration.email = form.email.trim();
      }

      const response = await fetch(`${API_URL}/api/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registration),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? "This phone number or email is already registered."
            : result.message || "Unable to create donor account",
        );
      }

      onRegistered(result);
    } catch (registrationError) {
      setError(registrationError.message || "Could not connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-panel" aria-labelledby="register-title">
      <button className="back-link" type="button" onClick={onBack}>
        Back
      </button>
      <p className="eyebrow">Donor account</p>
      <h1 id="register-title">Create account</h1>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="register-name">Full name</label>
        <input
          autoComplete="name"
          id="register-name"
          maxLength={100}
          name="name"
          onChange={updateField}
          required
          value={form.name}
        />

        <label htmlFor="register-phone">Phone number</label>
        <input
          autoComplete="tel"
          id="register-phone"
          name="phone"
          onChange={updateField}
          maxLength={10}
          pattern="[6-9][0-9]{9}"
          required
          type="tel"
          value={form.phone}
        />

        <label htmlFor="register-email">Email (optional)</label>
        <input
          autoComplete="email"
          id="register-email"
          maxLength={254}
          name="email"
          onChange={updateField}
          type="email"
          value={form.email}
        />

        <label htmlFor="register-language">Preferred language</label>
        <select
          id="register-language"
          name="preferredLanguage"
          onChange={updateField}
          value={form.preferredLanguage}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
        </select>

        <label htmlFor="register-password">Password</label>
        <input
          autoComplete="new-password"
          id="register-password"
          maxLength={72}
          minLength={8}
          name="password"
          onChange={updateField}
          required
          type="password"
          value={form.password}
        />

        <label htmlFor="register-confirm-password">Confirm password</label>
        <input
          autoComplete="new-password"
          id="register-confirm-password"
          maxLength={72}
          minLength={8}
          name="confirmPassword"
          onChange={updateField}
          required
          type="password"
          value={form.confirmPassword}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="submit-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : "Create donor account"}
        </button>
      </form>

      <button className="auth-switch" type="button" onClick={onLogin}>
        Already registered? Login
      </button>
    </section>
  );
}

export default RegisterDonor;
