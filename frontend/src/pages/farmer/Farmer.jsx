import { useEffect, useState } from "react";
import {
  ClipboardList,
  FileText,
  Home,
  PlusCircle,
  User,
} from "lucide-react";
import FarmerDashboard from "./FarmerDashboard.jsx";
import FarmerDocuments from "./FarmerDocuments.jsx";
import FarmerProfile from "./FarmerProfile.jsx";
import FarmerRequestDetail from "./FarmerRequestDetail.jsx";
import FarmerRequests from "./FarmerRequests.jsx";
import NewRequestVoice from "./NewRequestVoice.jsx";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

export default function Farmer({ user, onLogout }) {
  // Tabs: 'dashboard' | 'new-request' | 'requests' | 'request-detail' | 'documents' | 'profile'
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [currentUser, setCurrentUser] = useState(user);

  const lang = currentUser?.preferredLanguage || "en";
  const t = getStrings(lang);

  // Sync farmer's latest verification status and profile on mount
  useEffect(() => {
    let isMounted = true;
    async function syncFarmer() {
      try {
        const data = await farmerApi.getDashboard();
        if (isMounted && data?.farmer) {
          setCurrentUser((prev) => ({
            ...prev,
            ...data.farmer,
            canRequestHelp: data.canRequestHelp,
          }));
        }
      } catch (err) {
        console.warn("Could not sync farmer status on mount:", err);
      }
    }
    syncFarmer();
    return () => { isMounted = false; };
  }, []);

  function handleDashboardLoaded(data) {
    if (data?.farmer) {
      setCurrentUser((prev) => ({
        ...prev,
        ...data.farmer,
        canRequestHelp: data.canRequestHelp,
      }));
    }
  }

  function handleNavigateTab(tab) {
    if (tab !== "new-request") {
      setActiveDraft(null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSelectRequest(id) {
    setSelectedRequestId(id);
    setActiveTab("request-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleResumeDraft(draft) {
    setActiveDraft(draft);
    setActiveTab("new-request");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleProfileUpdated(updatedProfile) {
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedProfile,
    }));
  }

  // Navigation Items
  const navItems = [
    {
      key: "dashboard",
      label: t.nav.home,
      icon: Home,
    },
    {
      key: "new-request",
      label: t.nav.requestHelp,
      icon: PlusCircle,
      highlight: true,
    },
    {
      key: "requests",
      label: t.nav.myRequests,
      icon: ClipboardList,
    },
    {
      key: "documents",
      label: t.nav.documents,
      icon: FileText,
    },
    {
      key: "profile",
      label: t.nav.profile,
      icon: User,
    },
  ];

  return (
    <div className="min-h-dvh bg-background text-text pb-20 md:pb-8 flex flex-col justify-between">
      {/* Desktop / Tablet Sub-Navbar */}
      <nav
        aria-label="Farmer desktop navigation"
        className="hidden md:flex items-center justify-center gap-2 py-3 px-4 bg-surface border-b border-border sticky top-[68px] z-30 shadow-xs"
      >
        <div className="flex items-center gap-1.5 max-w-2xl w-full justify-between">
          {navItems.map(({ key, label, icon: Icon, highlight }) => {
            const isActive =
              activeTab === key || (key === "requests" && activeTab === "request-detail");

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigateTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? highlight
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-primary-soft text-primary-soft-text border border-primary/30"
                    : highlight
                    ? "bg-primary-soft/60 text-primary-soft-text hover:bg-primary-soft"
                    : "text-text-muted hover:text-text hover:bg-surface-muted"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Workspace Content Area */}
      <main className="flex-1 w-full">
        {activeTab === "dashboard" && (
          <FarmerDashboard
            user={currentUser}
            onNavigateTab={handleNavigateTab}
            onSelectRequest={handleSelectRequest}
            onResumeDraft={handleResumeDraft}
            onDashboardLoaded={handleDashboardLoaded}
          />
        )}

        {activeTab === "new-request" && (
          <NewRequestVoice
            user={currentUser}
            initialDraft={activeDraft}
            onBack={() => handleNavigateTab("dashboard")}
            onSubmitted={() => handleNavigateTab("requests")}
          />
        )}

        {activeTab === "requests" && (
          <FarmerRequests
            user={currentUser}
            onSelectRequest={handleSelectRequest}
            onNewRequest={() => handleNavigateTab("new-request")}
          />
        )}

        {activeTab === "request-detail" && (
          <FarmerRequestDetail
            requestId={selectedRequestId}
            user={currentUser}
            onBack={() => handleNavigateTab("requests")}
            onEditDraft={(draft) => handleResumeDraft(draft)}
          />
        )}

        {activeTab === "documents" && (
          <FarmerDocuments
            user={currentUser}
            onBack={() => handleNavigateTab("dashboard")}
          />
        )}

        {activeTab === "profile" && (
          <FarmerProfile
            user={currentUser}
            onProfileUpdated={handleProfileUpdated}
            onBack={() => handleNavigateTab("dashboard")}
          />
        )}
      </main>

      {/* Mobile One-Handed Bottom Tab Bar (Fixed at bottom for ~360px+ viewport) */}
      <nav
        aria-label="Farmer mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border px-2 py-1 shadow-lg"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map(({ key, label, icon: Icon, highlight }) => {
            const isActive =
              activeTab === key || (key === "requests" && activeTab === "request-detail");

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigateTab(key)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "text-primary font-extrabold"
                    : "text-text-muted font-medium hover:text-text"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    highlight
                      ? isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-primary-soft text-primary-soft-text"
                      : isActive
                      ? "bg-primary-soft text-primary-soft-text"
                      : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 leading-tight truncate max-w-[68px]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
