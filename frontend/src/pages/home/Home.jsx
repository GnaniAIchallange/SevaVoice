import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck,
  HandCoins,
  Heart,
  HeartHandshake,
  HelpCircle,
  IndianRupee,
  Mic,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Volume2,
  Calendar,
  MapPin,
  Eye,
  Loader2,
  AlertCircle,
  Quote,
} from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";
import { API_URL } from "../../lib/apiConfig.js";
import RequestDetailModal from "../donor/RequestDetailModal.jsx";
import DonationModal from "../donor/DonationModal.jsx";

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Farmer Submits Request",
    description:
      "A farmer speaks their urgent agricultural need in their mother tongue (Hindi, Marathi, English) via voice AI or simple text.",
    icon: Mic,
  },
  {
    step: "02",
    title: "Verifier Inspects Documents",
    description:
      "Certified local verifiers inspect government-issued Aadhaar identity and 7/12 land records to establish authenticity.",
    icon: FileCheck,
  },
  {
    step: "03",
    title: "Request is Approved & Listed",
    description:
      "Once both the farmer identity and agricultural necessity are approved, the case is published to the public donor portal.",
    icon: ShieldCheck,
  },
  {
    step: "04",
    title: "Donors Contribute Directly",
    description:
      "Kind-hearted donors explore verified cases and contribute directly through secure Razorpay payments without intermediaries.",
    icon: HeartHandshake,
  },
];

const WHY_CHOOSE_FEATURES = [
  {
    title: "Voice-First Accessibility",
    description:
      "No digital literacy barrier. Farmers can simply speak into their phones to apply for urgent crop assistance.",
    icon: Volume2,
  },
  {
    title: "Regional Language Support",
    description:
      "Native interaction in Marathi, Hindi, and English ensures rural communities are understood in their own words.",
    icon: Users,
  },
  {
    title: "Rigorous Document Verification",
    description:
      "Aadhaar cards and land ownership records are independently examined before any request is published.",
    icon: Shield,
  },
  {
    title: "Transparent Assistance Requests",
    description:
      "See clear breakdowns of seed, fertilizer, irrigation, and medical costs with real-time funding progress bars.",
    icon: Eye,
  },
  {
    title: "Direct Farmer-Donor Connection",
    description:
      "100% direct impact. Contributions are recorded immediately with verified Razorpay payment IDs and public tracking.",
    icon: HandCoins,
  },
  {
    title: "Audited Ledger & Governance",
    description:
      "Comprehensive admin oversight and tamper-evident audit logs safeguard every rupee donated on SevaVoice.",
    icon: CheckCircle2,
  },
];

export default function Home({ onNavigate }) {
  // Real platform statistics from database
  const [stats, setStats] = useState({
    totalDonors: 0,
    totalVerifiedFarmers: 0,
    totalApprovedRequests: 0,
    totalFarmersAssisted: 0,
    totalDonationsAmount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Recently approved farmer requests from database
  const [recentRequests, setRecentRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Modals for preview & direct donation
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [donationTargetRequest, setDonationTargetRequest] = useState(null);

  useEffect(() => {
    // 1. Fetch real dynamic impact stats
    async function loadStats() {
      try {
        setStatsLoading(true);
        const res = await fetch(`${API_URL}/api/donor/impact-stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error loading platform stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }

    // 2. Fetch real recently approved requests
    async function loadRecent() {
      try {
        setRequestsLoading(true);
        const res = await fetch(`${API_URL}/api/donor/overview`);
        if (res.ok) {
          const data = await res.json();
          setRecentRequests(data.recentApprovedRequests || []);
        }
      } catch (err) {
        console.error("Error loading recent requests:", err);
      } finally {
        setRequestsLoading(false);
      }
    }

    loadStats();
    loadRecent();
  }, []);

  return (
    <div className="landing-page-wrapper">
      {/* SECTION A: HERO SECTION */}
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="landing-hero-inner">
          <div className="landing-hero-badge">
            <Sprout className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>Direct, Transparent Agricultural Support</span>
          </div>

          <h1 id="hero-heading" className="landing-hero-heading">
            Your Kindness Can Change a Farmer's Tomorrow.
          </h1>

          <p className="landing-hero-description">
            SevaVoice bridges the gap between rural farmers facing critical agricultural hardships and generous donors ready to support them. Powered by voice AI in regional languages and verified through genuine land and identity records.
          </p>

          <div className="landing-hero-ctas">
            <RouteLink
              to="/donor"
              className="submit-button home-primary landing-cta-btn inline-flex items-center gap-2"
              onNavigate={onNavigate}
            >
              <span>Explore Requests</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </RouteLink>

            <RouteLink
              to="/register/donor"
              className="home-secondary landing-cta-secondary inline-flex items-center gap-2"
              onNavigate={onNavigate}
            >
              <Heart className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Become a Donor</span>
            </RouteLink>
          </div>

          {/* Trust points underneath hero */}
          <div className="landing-hero-trust-row">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>100% Aadhaar & 7/12 Verified</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Voice AI in Native Languages</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Zero Intermediary Leakage</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: DYNAMIC IMPACT STATISTICS */}
      <section className="landing-stats-section" aria-label="Live Platform Impact Statistics">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="landing-section-badge">Verified Social Impact</span>
            <h2 className="landing-section-title">Transparent Numbers from Ground Reality</h2>
            <p className="text-text-muted text-sm sm:text-base">
              Real-time platform metrics dynamically aggregated from verified database records.
            </p>
          </div>

          <div className="landing-stats-grid">
            <div className="stat-impact-card">
              <div className="stat-icon-wrapper bg-primary-soft text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div className="stat-impact-number">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /> : stats.totalDonors}
              </div>
              <div className="stat-impact-label">Registered Donors</div>
              <div className="stat-impact-sub">Community members actively supporting farmers</div>
            </div>

            <div className="stat-impact-card">
              <div className="stat-icon-wrapper bg-success-soft text-success">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="stat-impact-number">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-success" /> : stats.totalVerifiedFarmers}
              </div>
              <div className="stat-impact-label">Verified Farmers</div>
              <div className="stat-impact-sub">Government ID & land records authenticated</div>
            </div>

            <div className="stat-impact-card">
              <div className="stat-icon-wrapper bg-warning-soft text-warning">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="stat-impact-number">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-warning" /> : stats.totalApprovedRequests}
              </div>
              <div className="stat-impact-label">Approved Requests</div>
              <div className="stat-impact-sub">Published for public donor assistance</div>
            </div>

            <div className="stat-impact-card">
              <div className="stat-icon-wrapper bg-info-soft text-info">
                <Sprout className="w-6 h-6" />
              </div>
              <div className="stat-impact-number">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-info" /> : stats.totalFarmersAssisted}
              </div>
              <div className="stat-impact-label">Farmers Assisted</div>
              <div className="stat-impact-sub">Fully funded or receiving active relief</div>
            </div>

            <div className="stat-impact-card col-span-full sm:col-span-2 lg:col-span-1">
              <div className="stat-icon-wrapper bg-primary-soft text-primary">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div className="stat-impact-number text-primary">
                {statsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                ) : (
                  `₹${Number(stats.totalDonationsAmount || 0).toLocaleString("en-IN")}`
                )}
              </div>
              <div className="stat-impact-label">Total Contributions</div>
              <div className="stat-impact-sub">Direct aid transferred via Razorpay</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: HOW SEVAVOICE WORKS */}
      <section className="landing-section bg-surface-muted py-16" id="how-it-works">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="landing-section-badge">Simple & Dignified</span>
            <h2 className="landing-section-title">How SevaVoice Works</h2>
            <p className="text-text-muted text-sm sm:text-base">
              A transparent four-step process built to keep aid fast, accountable, and accessible to non-tech-savvy farmers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="how-it-works-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-bold">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-serif font-bold text-border opacity-60">{step}</span>
                </div>
                <h3 className="font-bold text-lg text-text font-serif mb-2">{title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION D: WHY CHOOSE SEVAVOICE */}
      <section className="landing-section py-16">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="landing-section-badge">Engineered with Purpose</span>
            <h2 className="landing-section-title">Why Choose SevaVoice?</h2>
            <p className="text-text-muted text-sm sm:text-base">
              Designed specifically for the socioeconomic realities of rural India's farming communities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE_FEATURES.map(({ title, description, icon: Icon }) => (
              <div key={title} className="why-card">
                <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-text mb-2">{title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION E: FEATURED FARMER REQUESTS */}
      <section className="landing-section bg-surface-muted py-16" id="browse-requests">
        <div className="landing-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="landing-section-badge">Verified Assistance Pipeline</span>
              <h2 className="landing-section-title">Featured Farmer Requests</h2>
              <p className="text-text-muted text-sm sm:text-base max-w-xl">
                Recently approved cases awaiting donor assistance. Every case has been independently verified.
              </p>
            </div>
            <RouteLink
              to="/donor"
              className="btn-secondary self-start md:self-auto inline-flex items-center gap-1.5"
              onNavigate={onNavigate}
            >
              <span>View All Requests</span>
              <ArrowRight className="w-4 h-4" />
            </RouteLink>
          </div>

          {requestsLoading ? (
            <div className="p-12 text-center text-text-muted flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Fetching verified farmer requests...</p>
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="empty-state p-12 text-center bg-surface rounded-2xl border border-border">
              <FileCheck className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold text-text mb-1">No Active Requests Pending Right Now</h3>
              <p className="text-text-muted text-sm max-w-md mx-auto">
                All recent verified farmer requests have either been funded or are currently undergoing document review by verifiers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentRequests.slice(0, 3).map((item) => {
                const percentFunded = Math.min(
                  100,
                  Math.round(((item.amountFunded || 0) / (item.amountRequested || 1)) * 100)
                );

                return (
                  <article className="featured-request-card" key={item.id}>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="category-pill">{item.category}</span>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="verified-trust-badge mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aadhaar & Land Record Verified</span>
                      </div>

                      <h3 className="font-bold text-lg text-text font-serif mb-2 line-clamp-1">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-1 text-xs text-text-muted mb-3">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>
                          Farmer: <strong>{item.farmer?.name}</strong> &bull;{" "}
                          {[item.farmer?.village, item.farmer?.district, item.farmer?.state]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>

                      <p className="text-text-muted text-sm line-clamp-3 mb-4">
                        {item.reason || item.purpose || "Urgent assistance requested for farm inputs."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">
                          Goal: <strong className="text-text">₹{Number(item.amountRequested).toLocaleString()}</strong>
                        </span>
                        <span className="text-success font-semibold">
                          Raised: ₹{Number(item.amountFunded || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full bg-success transition-all duration-300"
                          style={{ width: `${percentFunded}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="btn-secondary w-full text-xs py-2 inline-flex items-center justify-center gap-1"
                          onClick={() => setSelectedRequestId(item.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                        <button
                          type="button"
                          className="btn-primary w-full text-xs py-2 inline-flex items-center justify-center gap-1"
                          onClick={() => setDonationTargetRequest(item)}
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Donate</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECTION F: IMPACT STORIES */}
      <section className="landing-section py-16">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="landing-section-badge">Real Agricultural Transformation</span>
            <h2 className="landing-section-title">Impact Stories from the Soil</h2>
            <p className="text-text-muted text-sm sm:text-base">
              How timely community support restores hope and protects seasonal crop yields for verified farmers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="impact-story-card">
              <Quote className="w-10 h-10 text-primary opacity-30 mb-3" />
              <p className="text-text text-sm sm:text-base leading-relaxed italic mb-6">
                "When my irrigation borewell pump failed just before monsoon sowing, I had no emergency savings. With SevaVoice, I explained my situation in Marathi using my voice. Within four days of verification, donors funded the repairs and my jowar crop was saved."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-11 h-11 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center">
                  RP
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">Ramesh Patil</h4>
                  <p className="text-text-muted text-xs">Shirur, Pune &bull; Sugarcane & Jowar Cultivator</p>
                </div>
              </div>
            </div>

            <div className="impact-story-card">
              <Quote className="w-10 h-10 text-success opacity-30 mb-3" />
              <p className="text-text text-sm sm:text-base leading-relaxed italic mb-6">
                "As a woman farmer managing 2 acres, access to certified seeds and organic fertilizer in time makes the difference between debt and self-reliance. The direct support gave our family dignity without running after private moneylenders."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-11 h-11 rounded-full bg-success-soft text-success font-bold flex items-center justify-center">
                  SJ
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">Sunita Jadhav</h4>
                  <p className="text-text-muted text-xs">Karjat, Ahmednagar &bull; Smallholder Organic Grower</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION G: FINAL CTA */}
      <section className="landing-final-cta-section my-10">
        <div className="landing-container">
          <div className="landing-final-cta-box">
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white mb-4">
              Be the Reason a Farmer Harvests Hope
            </h2>
            <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Every verified contribution protects agricultural livelihoods, fosters food security, and honors the farmers who nourish our society.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <RouteLink
                to="/donor"
                className="submit-button home-primary bg-white text-primary hover:bg-white/90 font-bold px-8 py-3.5 rounded-xl shadow-lg inline-flex items-center gap-2"
                onNavigate={onNavigate}
              >
                <span>Browse Approved Requests</span>
                <ArrowRight className="w-4 h-4 text-primary" />
              </RouteLink>
              <RouteLink
                to="/register/donor"
                className="home-secondary border-white/40 text-white hover:bg-white/10 px-8 py-3.5 rounded-xl font-bold"
                onNavigate={onNavigate}
              >
                Create Donor Account
              </RouteLink>
            </div>
          </div>
        </div>
      </section>

      {/* Modals for Direct Preview & Donate on Homepage */}
      {selectedRequestId && (
        <RequestDetailModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onDonate={(req) => {
            setSelectedRequestId(null);
            setDonationTargetRequest(req);
          }}
        />
      )}

      {donationTargetRequest && (
        <DonationModal
          request={donationTargetRequest}
          onClose={() => setDonationTargetRequest(null)}
          onSuccess={() => {
            setDonationTargetRequest(null);
          }}
        />
      )}
    </div>
  );
}
