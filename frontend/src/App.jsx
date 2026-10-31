import { useCallback, useEffect, useState } from "react";
import {
  HeartHandshake,
  HelpCircle,
  Home as HomeIcon,
  Info,
  LogIn,
  Mail,
  Menu,
  Search,
  Sprout,
  UserPlus,
  X,
} from "lucide-react";
import Admin from "./pages/admin/Admin.jsx";
import Donor from "./pages/donor/Donor.jsx";
import Farmer from "./pages/farmer/Farmer.jsx";
import Home from "./pages/home/Home.jsx";
import About from "./pages/about/About.jsx";
import Contact from "./pages/contact/Contact.jsx";
import Login from "./pages/login/Login.jsx";
import RegistrationChooser from "./pages/register/RegistrationChooser.jsx";
import RegisterDonor from "./pages/register/RegisterDonor.jsx";
import RegisterFarmer from "./pages/register/RegisterFarmer.jsx";
import Verifier from "./pages/verifier/Verifier.jsx";
import RouteLink from "./components/RouteLink.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import Footer from "./components/Footer.jsx";
import FarmerWelcomeModal from "./components/FarmerWelcomeModal.jsx";

import "./App.css";

const ROLE_PAGES = {
  admin: Admin,
  verifier: Verifier,
  donor: Donor,
  farmer: Farmer,
};

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/contact",
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
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem("seva-welcome-seen");
      if (!seen && !user && (pathname === "/" || pathname === "")) {
        setWelcomeModalOpen(true);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [user, pathname]);

  const navigate = useCallback((path, replace = false) => {
    const nextPath = normalizePath(path);
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
    setPathname(nextPath);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Helper to determine active state for navigation links
  const isActive = (targetPath) => resolvedPath === targetPath;

  return (
    <div className="app-shell min-h-dvh flex flex-col bg-background text-text">
      <header className="topbar sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border transition-colors">
        <div className="brand-wrapper">
          <RouteLink className="brand flex items-center gap-2" to="/" onNavigate={navigate}>
            <Sprout className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
            <span className="font-serif font-bold text-xl sm:text-2xl text-primary">SevaVoice</span>
          </RouteLink>
        </div>

        {/* Complete Navbar Links */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Desktop Navigation Links */}
          <nav className="desktop-nav items-center hidden xl:flex gap-1" aria-label="Main navigation">
            <RouteLink
              className={`nav-link text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive("/") ? "active-nav-link text-primary bg-primary-soft" : "text-text-muted hover:text-primary hover:bg-surface-muted"
              }`}
              to="/"
              onNavigate={navigate}
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Home</span>
            </RouteLink>

            <RouteLink
              className={`nav-link text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive("/about") ? "active-nav-link text-primary bg-primary-soft" : "text-text-muted hover:text-primary hover:bg-surface-muted"
              }`}
              to="/about"
              onNavigate={navigate}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About Us</span>
            </RouteLink>

            <a
              href="#how-it-works"
              onClick={(e) => {
                if (resolvedPath !== "/") {
                  e.preventDefault();
                  navigate("/");
                  setTimeout(() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  }, 150);
                }
              }}
              className="nav-link text-xs font-semibold px-2.5 py-2 rounded-lg text-text-muted hover:text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How It Works</span>
            </a>

            <RouteLink
              className={`nav-link text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive("/contact") ? "active-nav-link text-primary bg-primary-soft" : "text-text-muted hover:text-primary hover:bg-surface-muted"
              }`}
              to="/contact"
              onNavigate={navigate}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Us</span>
            </RouteLink>
          </nav>

          <div className="flex items-center gap-2">
            {/* Farmer Welcome Popup trigger button */}
            <button
              type="button"
              onClick={() => setWelcomeModalOpen(true)}
              className="farmer-nav-badge hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              title="शेतकरी आहात? येथे सुरू करा / Farmer? Get Started"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Farmer? Get Started</span>
            </button>

            <ThemeToggle />

            {/* Authenticated user vs Guest CTAs */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                {RolePage && (
                  <RouteLink
                    className="nav-link text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-soft text-primary capitalize"
                    to={`/${user.role}`}
                    onNavigate={navigate}
                  >
                    {user.role} workspace
                  </RouteLink>
                )}
                <button
                  className="login-link text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-danger"
                  type="button"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <RouteLink
                  className={`nav-link text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 ${
                    isActive("/login") ? "text-primary bg-primary-soft" : "text-text-muted hover:text-primary"
                  }`}
                  to="/login"
                  onNavigate={navigate}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </RouteLink>
                <RouteLink
                  className="nav-register text-xs font-bold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm inline-flex items-center gap-1.5"
                  to="/register"
                  onNavigate={navigate}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </RouteLink>
              </div>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              type="button"
              className="mobile-nav-toggle xl:hidden"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <div
          className={`mobile-nav-menu xl:hidden ${mobileMenuOpen ? "open" : ""}`}
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1 p-2">
            <RouteLink
              className={`nav-link text-sm font-semibold p-3 rounded-xl flex items-center gap-2.5 ${
                isActive("/") ? "text-primary bg-primary-soft font-bold" : "text-text-muted"
              }`}
              to="/"
              onNavigate={navigate}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </RouteLink>

            <RouteLink
              className={`nav-link text-sm font-semibold p-3 rounded-xl flex items-center gap-2.5 ${
                isActive("/about") ? "text-primary bg-primary-soft font-bold" : "text-text-muted"
              }`}
              to="/about"
              onNavigate={navigate}
            >
              <Info className="w-4 h-4" />
              <span>About Us</span>
            </RouteLink>

            <a
              href="#how-it-works"
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (resolvedPath !== "/") {
                  e.preventDefault();
                  navigate("/");
                  setTimeout(() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  }, 200);
                }
              }}
              className="nav-link text-sm font-semibold p-3 rounded-xl flex items-center gap-2.5 text-text-muted"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How It Works</span>
            </a>

            <RouteLink
              className={`nav-link text-sm font-semibold p-3 rounded-xl flex items-center gap-2.5 ${
                isActive("/contact") ? "text-primary bg-primary-soft font-bold" : "text-text-muted"
              }`}
              to="/contact"
              onNavigate={navigate}
            >
              <Mail className="w-4 h-4" />
              <span>Contact Us</span>
            </RouteLink>

            {/* Mobile Farmer Welcome Popup trigger */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setWelcomeModalOpen(true);
              }}
              className="farmer-nav-badge w-full text-left p-3 rounded-xl flex items-center justify-between text-sm font-bold shadow-sm my-1"
            >
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4" />
                <span>Farmer? Get Started</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md">मदत / Help</span>
            </button>

            <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
              {user ? (
                <>
                  {RolePage && (
                    <RouteLink
                      className="nav-link text-sm font-bold p-3 rounded-xl bg-primary-soft text-primary capitalize flex items-center gap-2"
                      to={`/${user.role}`}
                      onNavigate={navigate}
                    >
                      <Sprout className="w-4 h-4" />
                      <span>{user.role} workspace</span>
                    </RouteLink>
                  )}
                  <button
                    className="login-link text-left text-sm font-semibold p-3 rounded-xl text-danger hover:bg-danger-soft"
                    type="button"
                    onClick={handleLogout}
                  >
                    Log out ({user.name})
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <RouteLink
                    className="nav-link text-sm font-bold p-3 rounded-xl border border-border text-center justify-center flex items-center gap-1.5"
                    to="/login"
                    onNavigate={navigate}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </RouteLink>
                  <RouteLink
                    className="nav-register text-sm font-bold p-3 rounded-xl bg-primary text-primary-foreground text-center justify-center flex items-center gap-1.5"
                    to="/register"
                    onNavigate={navigate}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Get Started</span>
                  </RouteLink>
                </div>
              )}
            </div>
          </div>
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
        ) : resolvedPath === "/about" ? (
          <About onNavigate={navigate} />
        ) : resolvedPath === "/contact" ? (
          <Contact onNavigate={navigate} />
        ) : (
          <Home onNavigate={navigate} />
        )}
      </main>

      {/* Global Comprehensive Site Footer */}
      <Footer onNavigate={navigate} />

      {/* Multilingual Voice-First Farmer Welcome Modal */}
      <FarmerWelcomeModal
        isOpen={welcomeModalOpen}
        onClose={() => setWelcomeModalOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}

export default App;
