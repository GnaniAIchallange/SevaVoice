import RouteLink from "../../components/RouteLink.jsx";
import { HeartHandshake, Sprout } from "lucide-react";

function RegistrationChooser({ onNavigate }) {
  return (
    <section className="login-panel" aria-labelledby="registration-choice-title">
      <RouteLink className="back-link" to="/" onNavigate={onNavigate}>
        Back
      </RouteLink>
      <p className="eyebrow">SevaVoice registration</p>
      <h1 id="registration-choice-title">Choose how to register</h1>
      <div className="mt-6 grid gap-4">
        <RouteLink
          className="flex min-h-16 items-center justify-center rounded-xl border-2 border-emerald-900 bg-emerald-800 px-5 py-4 text-center text-xl font-bold text-white no-underline hover:bg-emerald-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          to="/register/donor"
          onNavigate={onNavigate}
        >
          <span className="flex items-center justify-center gap-3">
            <HeartHandshake aria-hidden="true" size={26} />
            Register as Donor / देणगीदार / दाता
          </span>
        </RouteLink>
        <RouteLink
          className="flex min-h-16 items-center justify-center rounded-xl border-2 border-emerald-900 bg-white px-5 py-4 text-center text-xl font-bold text-emerald-950 no-underline hover:bg-emerald-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          to="/register/farmer"
          onNavigate={onNavigate}
        >
          <span className="flex items-center justify-center gap-3">
            <Sprout aria-hidden="true" size={26} />
            Register as Farmer / शेतकरी / किसान
          </span>
        </RouteLink>
      </div>
    </section>
  );
}

export default RegistrationChooser;
