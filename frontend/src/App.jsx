import { useCallback, useEffect, useState } from "react";
import { Menu, Sprout, X } from "lucide-react";
import Admin from "./pages/admin/Admin.jsx";
import Donor from "./pages/donor/Donor.jsx";
import Farmer from "./pages/farmer/Farmer.jsx";
import Home from "./pages/home/Home.jsx";
import Login from "./pages/login/Login.jsx";
import RegistrationChooser from "./pages/register/RegistrationChooser.jsx";
import RegisterDonor from "./pages/register/RegisterDonor.jsx";
import RegisterFarmer from "./pages/register/RegisterFarmer.jsx";
import Verifier from "./pages/verifier/Verifier.jsx";
import RouteLink from "./components/RouteLink.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

import "./App.css";

const ROLE_PAGES = {
  admin: Admin,
  verifier: Verifier,
  donor: Donor,
  farmer: Farmer,
};
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/register/donor",
  "/register/farmer",
];
const ROLE_PATHS = Object.keys(ROLE_PAGES).map((role) => `/${role}`);

function normalizePath(path) {
  return path.replace(/\/+$/, "") || "/";
}

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
  const [pathname, setPathname] = useState(() =>
    normalizePath(window.location.pathname),
  );
  const [user, setUser] = useState(readSavedUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useCallback((path, replace = false) => {
    const nextPath = normalizePath(path);
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
    setPathname(nextPath);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    function handlePopState() {
      setPathname(normalizePath(window.location.pathname));
      setMobileMenuOpen(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const RolePage = user ? ROLE_PAGES[user.role] : null;
  const rolePath = user && RolePage ? `/${user.role}` : null;
  let resolvedPath = pathname;
  const isRolePath = ROLE_PATHS.includes(pathname);

  if (!PUBLIC_PATHS.includes(pathname) && !isRolePath) {
    resolvedPath = "/";
  } else if (!user && isRolePath) {
    resolvedPath = "/login";
  } else if (
    rolePath &&
    (PUBLIC_PATHS.includes(pathname) || (isRolePath && pathname !== rolePath))
  ) {
    resolvedPath = rolePath;
  }

  useEffect(() => {
    if (pathname !== resolvedPath) {
      window.history.replaceState({}, "", resolvedPath);
    }
  }, [pathname, resolvedPath]);

  function handleAuthenticated(result) {
    sessionStorage.setItem(
      "seva-auth",
      JSON.stringify({ token: result.token, user: result.user }),
    );
    setUser(result.user);
    if (ROLE_PAGES[result.user.role]) {
      navigate(`/${result.user.role}`, true);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("seva-auth");
    setUser(null);
    setMobileMenuOpen(false);
    navigate("/login", true);
  }

  return (
    <div className="app-shell min-h-dvh flex flex-col bg-background text-text">
      <header className="topbar">
        <div className="brand-wrapper">
          <RouteLink className="brand" to="/" onNavigate={navigate}>
            <Sprout className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
            <span>SevaVoice</span>
          </RouteLink>
        </div>

        {/* Right side controls: Theme toggle + Nav */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Main navigation">
            {user ? (
              <>
                {RolePage && (
                  <RouteLink
                    className="nav-link"
                    to={`/${user.role}`}
                    onNavigate={navigate}
                  >
                    <span className="capitalize">{user.role}</span> workspace
                  </RouteLink>
                )}
                <button
                  className="login-link"
                  type="button"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <RouteLink className="nav-link" to="/login" onNavigate={navigate}>
                  Login
                </RouteLink>
                <RouteLink
                  className="nav-register"
                  to="/register"
                  onNavigate={navigate}
                >
                  Register
                </RouteLink>
              </>
            )}
          </nav>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div className={`mobile-nav-menu ${mobileMenuOpen ? "open" : ""}`} aria-label="Mobile navigation">
          {user ? (
            <>
              {RolePage && (
                <RouteLink
                  className="nav-link"
                  to={`/${user.role}`}
                  onNavigate={navigate}
                >
                  <span className="capitalize">{user.role}</span> workspace
                </RouteLink>
              )}
              <button
                className="login-link text-left"
                type="button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <RouteLink className="nav-link" to="/login" onNavigate={navigate}>
                Login
              </RouteLink>
              <RouteLink
                className="nav-register"
                to="/register"
                onNavigate={navigate}
              >
                Register
              </RouteLink>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        {user && !RolePage ? (
          <section className="login-panel" aria-labelledby="unknown-role-title">
            <h1 id="unknown-role-title">Account role not recognized</h1>
            <button className="submit-button" type="button" onClick={handleLogout}>
              Log out
            </button>
          </section>
        ) : RolePage && ROLE_PATHS.includes(resolvedPath) ? (
          <RolePage user={user} onLogout={handleLogout} />
        ) : resolvedPath === "/login" ? (
          <Login onNavigate={navigate} onAuthenticated={handleAuthenticated} />
        ) : resolvedPath === "/register" ? (
          <RegistrationChooser onNavigate={navigate} />
        ) : resolvedPath === "/register/donor" ? (
          <RegisterDonor
            onBack={() => navigate("/")}
            onLogin={() => navigate("/login")}
            onRegistered={handleAuthenticated}
          />
        ) : resolvedPath === "/register/farmer" ? (
          <RegisterFarmer onNavigate={navigate} />
        ) : (
          <Home onNavigate={navigate} />
        )}
      </main>
    </div>
  );
}

export default App;
