import { ArrowLeft, ArrowRight, HeartHandshake, Sprout } from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";

function RegistrationChooser({ onNavigate }) {
  return (
    <section className="login-panel" aria-labelledby="registration-choice-title">
      <RouteLink className="back-link inline-flex items-center gap-1.5" to="/" onNavigate={onNavigate}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to home</span>
      </RouteLink>
      <p className="eyebrow">SevaVoice registration</p>
      <h1 id="registration-choice-title">Choose how to register</h1>
      <p className="text-text-muted text-sm -mt-3 mb-6">
        Select your role to get started with the right onboarding experience.
      </p>

      <div className="grid gap-4">
        <RouteLink
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-primary bg-primary px-6 py-5 text-left text-lg font-bold text-primary-foreground no-underline transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shadow-xs group"
          to="/register/donor"
          onNavigate={onNavigate}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <HeartHandshake aria-hidden="true" size={26} />
            </div>
            <div>
              <span className="block text-base sm:text-lg">Register as Donor</span>
              <span className="block text-xs sm:text-sm font-medium opacity-85 mt-0.5">देणगीदार / दाता</span>
            </div>
          </div>
          <ArrowRight size={20} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </RouteLink>

        <RouteLink
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-border bg-surface px-6 py-5 text-left text-lg font-bold text-text no-underline transition-all hover:border-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shadow-xs group"
          to="/register/farmer"
          onNavigate={onNavigate}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Sprout aria-hidden="true" size={26} />
            </div>
            <div>
              <span className="block text-base sm:text-lg">Register as Farmer</span>
              <span className="block text-xs sm:text-sm font-medium text-text-muted mt-0.5">शेतकरी / किसान (Voice Assisted)</span>
            </div>
          </div>
          <ArrowRight size={20} className="shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </RouteLink>
      </div>
    </section>
  );
}

export default RegistrationChooser;
