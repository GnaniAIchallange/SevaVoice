import {
  Heart,
  Target,
  Eye,
  Shield,
  FileCheck,
  CheckCircle,
  Users,
  Sparkles,
  Mail,
  ArrowRight,
  Sprout,
  HandHeart,
  Volume2,
  Globe,
  ExternalLink,
} from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";

const CORE_VALUES = [
  {
    title: "Trust",
    icon: Shield,
    description:
      "Every farmer request is backed by real human verification of Aadhaar and 7/12 land records before publication.",
  },
  {
    title: "Transparency",
    icon: Eye,
    description:
      "100% of donor contributions flow directly to verified farmers. Every rupee and transaction is tracked and auditable.",
  },
  {
    title: "Accessibility",
    icon: Volume2,
    description:
      "Voice-first technology allows rural farmers to state their agricultural needs naturally in their native languages without typing.",
  },
  {
    title: "Compassion",
    icon: Heart,
    description:
      "We believe technology should serve humanity's most vulnerable food producers with dignity, empathy, and urgency.",
  },
  {
    title: "Inclusion",
    icon: Users,
    description:
      "Bridging the digital divide so smallholder and marginal farmers from any remote village have equal access to community goodwill.",
  },
];

const DEVELOPERS = [
  {
    name: "Shreyansh Mojidra",
    role: "Full-Stack Engineer & AI Voice Integration",
    bio: "Passionate about building inclusive voice systems, scalable distributed architectures, and intuitive web experiences that bridge technology and grassroots community impact.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    initials: "SM",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Yash Deshmukh",
    role: "Full-Stack Engineer & Verification Systems",
    bio: "Dedicated to designing resilient web applications, verifiable document workflows, and transparent donation pipelines that empower rural Indian farmers.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    initials: "YD",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
];

export default function About({ onNavigate }) {
  return (
    <div className="about-page-container">
      {/* Hero Section */}
      <section className="about-hero-section">
        <div className="about-hero-inner">
          <p className="eyebrow flex items-center gap-1.5">
            <Sprout className="w-4 h-4 text-primary" aria-hidden="true" />
            About SevaVoice
          </p>
          <h1 className="about-hero-title">Empowering the Hands That Feed Our Nation</h1>
          <p className="about-hero-copy">
            SevaVoice is a compassionate, transparent bridge connecting smallholder farmers in need with empathetic donors willing to help — powered by voice AI and rigorous ground verification.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="about-section">
        <div className="about-story-grid">
          <div>
            <span className="about-section-badge">Our Origin Story</span>
            <h2 className="about-section-heading">Why We Created SevaVoice</h2>
            <div className="about-story-text space-y-4">
              <p>
                India's agriculture supports over 600 million livelihoods, yet millions of smallholder farmers face unexpected seasonal crises: sudden monsoon delays, pest infestations, unaffordable certified seeds, or pump breakdowns that can wipe out an entire season's labor.
              </p>
              <p>
                Traditional relief programs and banking platforms are often complex, requiring extensive written applications, digital literacy, and English fluency. Many rural farmers who need support the most are uncomfortable typing on smartphones or navigating complex web portals.
              </p>
              <p>
                <strong>SevaVoice was born to remove these barriers completely.</strong> By enabling farmers to speak naturally in their native languages (Hindi, Marathi, English) through voice-based speech recognition, we translate spoken distress into verified community requests. Donors across the country can then browse verified needs and provide direct, transparent financial assistance.
              </p>
            </div>
          </div>
          <div className="about-story-card">
            <div className="about-highlight-box">
              <Volume2 className="w-8 h-8 text-primary shrink-0 mb-3" />
              <h3 className="font-bold text-lg text-text mb-2">Voice-First Accessibility</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                "No farmer should ever be denied help simply because they cannot fill out an online English form. Speaking your truth in your mother tongue is all that's required."
              </p>
            </div>
            <div className="about-highlight-box mt-4">
              <Shield className="w-8 h-8 text-success shrink-0 mb-3" />
              <h3 className="font-bold text-lg text-text mb-2">Independent Verification</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                "Every request is vetted by field verifiers inspecting authentic government identity and land ownership records before a single rupee is sought."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="about-section bg-surface-muted py-14 px-4 sm:px-6 rounded-3xl my-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="mission-card">
            <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-text mb-3">Our Mission</h3>
            <p className="text-text-muted text-base leading-relaxed">
              "To make financial assistance accessible to farmers through technology, voice-based interaction and transparent verification."
            </p>
          </div>

          <div className="mission-card">
            <div className="w-12 h-12 rounded-2xl bg-success-soft text-success flex items-center justify-center mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-text mb-3">Our Vision</h3>
            <p className="text-text-muted text-base leading-relaxed">
              "A future where every farmer can access support with dignity, transparency and ease."
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="about-section my-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="about-section-badge">Principles That Guide Us</span>
          <h2 className="about-section-heading">Our Core Values</h2>
          <p className="text-text-muted text-sm sm:text-base">
            These foundational commitments shape every product decision, verification check, and community interaction on SevaVoice.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CORE_VALUES.map(({ title, icon: Icon, description }) => (
            <div key={title} className="value-card">
              <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-text mb-2">{title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Meet the Developers */}
      <section className="about-section my-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="about-section-badge">Engineering for Social Impact</span>
          <h2 className="about-section-heading">Meet the Developers</h2>
          <p className="text-text-muted text-sm sm:text-base">
            Architected and engineered with dedication to bring modern full-stack web and speech technology to rural Indian agriculture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {DEVELOPERS.map((dev) => (
            <div key={dev.name} className="dev-profile-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary font-bold text-xl flex items-center justify-center shrink-0 border border-border">
                  {dev.initials}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-text font-serif">{dev.name}</h3>
                  <p className="text-primary text-xs font-semibold uppercase tracking-wider">{dev.role}</p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed mb-6">{dev.bio}</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                {dev.github && (
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noreferrer"
                    className="dev-social-link"
                    aria-label={`${dev.name}'s GitHub`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>GitHub Profile</span>
                  </a>
                )}
                {dev.linkedin && (
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="dev-social-link"
                    aria-label={`${dev.name}'s LinkedIn`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>LinkedIn Profile</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="about-contact-section">
        <div className="max-w-3xl mx-auto text-center">
          <HandHeart className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-text mb-3">
            Have Questions or Want to Collaborate?
          </h2>
          <p className="text-text-muted text-sm sm:text-base mb-6 max-w-xl mx-auto">
            Whether you are an agricultural NGO, field verifier, or donor looking to make collective impact, our team is always ready to connect.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-4">
            <RouteLink
              to="/register/donor"
              className="submit-button home-primary inline-flex items-center gap-2"
              onNavigate={onNavigate}
            >
              <span>Join as a Donor</span>
              <ArrowRight className="w-4 h-4" />
            </RouteLink>
            <RouteLink
              to="/donor"
              className="home-secondary"
              onNavigate={onNavigate}
            >
              Explore Farmer Requests
            </RouteLink>
          </div>
        </div>
      </section>
    </div>
  );
}
