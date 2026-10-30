import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Sprout,
  HeartHandshake,
} from "lucide-react";

export default function Contact({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate support ticket dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", subject: "general", message: "" });
    }, 600);
  }

  return (
    <div className="about-page-container">
      {/* Header */}
      <section className="about-hero-section">
        <div className="about-hero-inner">
          <p className="eyebrow flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
            Get In Touch
          </p>
          <h1 className="about-hero-title">We are Here to Support You</h1>
          <p className="about-hero-copy">
            Reach out with inquiries regarding farmer verification, donor support, online payments, or partnership opportunities.
          </p>
        </div>
      </section>

      <section className="about-section py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Contact Details & FAQs */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="about-section-badge">Support Channels</span>
              <h2 className="text-2xl font-bold font-serif text-text mb-3">Community Helpdesk</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-6">
                Our support team and verifier network are available to assist both farmers requesting aid and donors tracking their contributions.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-surface border border-border">
                <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">Direct Inquiries</h4>
                  <p className="text-text-muted text-xs mt-0.5">support@sevavoice.org</p>
                  <p className="text-text-muted text-xs">verification@sevavoice.org</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-surface border border-border">
                <div className="w-10 h-10 rounded-xl bg-success-soft text-success flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">Support Hours</h4>
                  <p className="text-text-muted text-xs mt-0.5">Monday to Saturday: 9:00 AM – 7:00 PM IST</p>
                  <p className="text-text-muted text-xs">Response time within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-surface border border-border">
                <div className="w-10 h-10 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">Verification Inquiries</h4>
                  <p className="text-text-muted text-xs mt-0.5">
                    For questions regarding Aadhaar, land record verification, or case officer status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-sm">
              <h3 className="text-xl font-bold font-serif text-text mb-2">Send us a Message</h3>
              <p className="text-text-muted text-sm mb-6">
                Fill in the form below and a team representative will get back to you shortly.
              </p>

              {submitted && (
                <div className="p-4 mb-6 rounded-2xl bg-success-soft border border-success/30 flex items-center gap-3 text-success">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-semibold m-0">
                    Thank you! Your message has been received. Our team will contact you shortly.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Topic / Inquiry Type
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="donor">Donor Support / Razorpay Payment</option>
                      <option value="farmer">Farmer Registration & Assistance</option>
                      <option value="verifier">Document Verification Support</option>
                      <option value="partnership">NGO / Community Partnership</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="How can we assist you?"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="submit-button home-primary w-full inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Sending..." : "Submit Inquiry"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
