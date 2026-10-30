import { ArrowRight, HeartHandshake, Shield, ShieldCheck, Sprout } from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";

const WORKSPACES = [
  {
    name: "Farmer",
    description: "Request and follow financial assistance via voice or text.",
    path: "/farmer",
    icon: Sprout,
  },
  {
    name: "Donor",
    description: "Support verified farmer needs with direct transparency.",
    path: "/donor",
    icon: HeartHandshake,
  },
  {
    name: "Verifier",
    description: "Review identity documents and verify assistance cases.",
    path: "/verifier",
    icon: ShieldCheck,
  },
  {
    name: "Admin",
    description: "Coordinate system metrics, users, and transactions.",
    path: "/admin",
    icon: Shield,
  },
];

function Home({ onNavigate }) {
  return (
    <section className="home-page" aria-labelledby="home-title">
      <p className="eyebrow flex items-center gap-1.5">
        <Sprout className="w-4 h-4 text-primary" aria-hidden="true" />
        Support that reaches the ground
      </p>
      <h1 id="home-title">A stronger community starts with seva.</h1>
      <p className="home-copy">
        SevaVoice brings farmers, donors, and authorized verifiers together in one place
        to deliver rapid, transparent community aid.
      </p>
      <div className="home-actions">
        <RouteLink
          className="submit-button home-primary inline-flex items-center gap-2"
          to="/login"
          onNavigate={onNavigate}
        >
          <span>Login to your account</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </RouteLink>
        <RouteLink
          className="home-secondary"
          to="/register"
          onNavigate={onNavigate}
        >
          Register for an account
        </RouteLink>
      </div>

      <div className="workspace-list" aria-label="Available workspaces">
        <h2>Dedicated workspaces</h2>
        <div className="workspace-grid">
          {WORKSPACES.map(({ name, description, path, icon: Icon }) => (
            <RouteLink
              className="workspace-card group"
              key={path}
              to={path}
              onNavigate={onNavigate}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg text-text group-hover:text-primary transition-colors">
                  {name}
                </span>
                <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>
              <p>{description}</p>
              <span className="workspace-card-link group-hover:gap-1.5 transition-all">
                <span>Open workspace</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </span>
            </RouteLink>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;
