import { useState } from "react";
import { ArrowLeft, Globe, HeartHandshake, Lock, Mail, Phone, User } from "lucide-react";

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
      <button className="back-link inline-flex items-center gap-1.5" type="button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to choice</span>
      </button>
      <p className="eyebrow flex items-center gap-1.5">
        <HeartHandshake size={14} className="text-primary" aria-hidden="true" />
        Donor account
      </p>
      <h1 id="register-title">Create account</h1>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="register-name" className="flex items-center gap-1.5">
          <User size={14} className="text-primary" aria-hidden="true" />
          <span>Full name</span>
        </label>
        <input
          autoComplete="name"
          id="register-name"
          maxLength={100}
          name="name"
          onChange={updateField}
          placeholder="Enter your full name"
          required
          value={form.name}
        />

        <label htmlFor="register-phone" className="flex items-center gap-1.5">
          <Phone size={14} className="text-primary" aria-hidden="true" />
          <span>Phone number (10 digits)</span>
        </label>
        <input
          autoComplete="tel"
          id="register-phone"
          name="phone"
          onChange={updateField}
          maxLength={10}
          pattern="[6-9][0-9]{9}"
          placeholder="e.g. 9876543210"
          required
          type="tel"
          value={form.phone}
        />

        <label htmlFor="register-email" className="flex items-center gap-1.5">
          <Mail size={14} className="text-primary" aria-hidden="true" />
          <span>Email (optional)</span>
        </label>
        <input
          autoComplete="email"
          id="register-email"
          maxLength={254}
          name="email"
          onChange={updateField}
          placeholder="e.g. yourname@example.com"
          type="email"
          value={form.email}
        />

        <label htmlFor="register-language" className="flex items-center gap-1.5">
          <Globe size={14} className="text-primary" aria-hidden="true" />
          <span>Preferred language</span>
        </label>
        <select
          id="register-language"
          name="preferredLanguage"
          onChange={updateField}
          value={form.preferredLanguage}
        >
          <option value="en">English</option>
          <option value="hi">Hindi (हिंदी)</option>
          <option value="mr">Marathi (मराठी)</option>
        </select>

        <label htmlFor="register-password" className="flex items-center gap-1.5">
          <Lock size={14} className="text-primary" aria-hidden="true" />
          <span>Password (min 8 chars)</span>
        </label>
        <input
          autoComplete="new-password"
          id="register-password"
          maxLength={72}
          minLength={8}
          name="password"
          onChange={updateField}
          placeholder="Create a secure password"
          required
          type="password"
          value={form.password}
        />

        <label htmlFor="register-confirm-password" className="flex items-center gap-1.5">
          <Lock size={14} className="text-primary" aria-hidden="true" />
          <span>Confirm password</span>
        </label>
        <input
          autoComplete="new-password"
          id="register-confirm-password"
          maxLength={72}
          minLength={8}
          name="confirmPassword"
          onChange={updateField}
          placeholder="Re-enter your password"
          required
          type="password"
          value={form.confirmPassword}
        />

        {error && (
          <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger-soft-text text-sm font-semibold mt-1" role="alert">
            {error}
          </div>
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
