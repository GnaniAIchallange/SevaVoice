import RouteLink from "../../components/RouteLink.jsx";

function Home({ onNavigate }) {
  return (
    <section className="home-page" aria-labelledby="home-title">
      <p className="eyebrow">Support that reaches the ground</p>
      <h1 id="home-title">A stronger community starts with seva.</h1>
      <p className="home-copy">
        SevaVoice brings farmers, donors, and the people coordinating support
        together in one place.
      </p>
      <div className="home-actions">
        <RouteLink
          className="submit-button home-primary"
          to="/login"
          onNavigate={onNavigate}
        >
          Login to your account
        </RouteLink>
        <RouteLink
          className="home-secondary"
          to="/register"
          onNavigate={onNavigate}
        >
          Register
        </RouteLink>
      </div>
      <div className="workspace-list" aria-label="Available workspaces">
        <h2>Dedicated workspaces</h2>
        <div className="workspace-grid">
          {[
            ["Farmer", "Request and follow assistance.", "/farmer"],
            ["Donor", "Support verified farmer needs.", "/donor"],
            ["Verifier", "Review and verify requests.", "/verifier"],
            ["Admin", "Coordinate the SevaVoice platform.", "/admin"],
          ].map(([name, description, path]) => (
            <RouteLink
              className="workspace-card"
              key={path}
              to={path}
              onNavigate={onNavigate}
            >
              <span>{name}</span>
              <p>{description}</p>
              <span className="workspace-card-link">Open workspace →</span>
            </RouteLink>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;
