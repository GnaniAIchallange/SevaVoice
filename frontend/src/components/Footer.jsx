import {
  Sprout,
  Heart,
  Shield,
  FileCheck,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import RouteLink from "./RouteLink.jsx";

export default function Footer({ onNavigate }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer bg-surface border-t border-border mt-auto pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <RouteLink to="/" className="brand inline-flex items-center gap-2" onNavigate={onNavigate}>
              <Sprout className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
              <span className="font-serif font-bold text-2xl text-primary">SevaVoice</span>
            </RouteLink>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm">
              Connecting rural smallholder farmers with verified agricultural aid through multilingual voice technology, independent document checks, and transparent community donations.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-success bg-success-soft py-1 px-3 rounded-full w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Verified Community Direct Aid</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-text mb-4 font-serif">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <RouteLink to="/" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Home
                </RouteLink>
              </li>
              <li>
                <RouteLink to="/about" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  About Us
                </RouteLink>
              </li>
              <li>
                <RouteLink to="/donor" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Browse Requests
                </RouteLink>
              </li>
              <li>
                <RouteLink to="/contact" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Contact Us
                </RouteLink>
              </li>
            </ul>
          </div>

          {/* Community Workspaces */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-text mb-4 font-serif">Workspaces</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <RouteLink to="/farmer" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Farmer Portal
                </RouteLink>
              </li>
              <li>
                <RouteLink to="/donor" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Donor Workspace
                </RouteLink>
              </li>
              <li>
                <RouteLink to="/verifier" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Verifier Center
                </RouteLink>
              </li>
              <li>
                <RouteLink to="/admin" className="text-text-muted hover:text-primary transition-colors" onNavigate={onNavigate}>
                  Admin Governance
                </RouteLink>
              </li>
            </ul>
          </div>

          {/* Contact & Developers */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-text mb-4 font-serif">Engineers</h4>
            <div className="space-y-3 text-xs text-text-muted">
              <div>
                <p className="font-bold text-text">Shreyansh Mojidra</p>
                <p>Full-Stack Engineer & AI Voice</p>
              </div>
              <div>
                <p className="font-bold text-text">Yash Deshmukh</p>
                <p>Full-Stack & Verification Systems</p>
              </div>
              <div className="pt-2">
                <p className="flex items-center gap-1.5 text-text-muted">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>support@sevavoice.org</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>© {currentYear} SevaVoice. Empowering farmers with dignity, transparency, and care.</p>
          <div className="flex items-center gap-6">
            <RouteLink to="/about" className="hover:text-primary transition-colors" onNavigate={onNavigate}>
              Our Story
            </RouteLink>
            <RouteLink to="/contact" className="hover:text-primary transition-colors" onNavigate={onNavigate}>
              Helpdesk
            </RouteLink>
            <RouteLink to="/donor" className="hover:text-primary transition-colors" onNavigate={onNavigate}>
              Support Farmers
            </RouteLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
