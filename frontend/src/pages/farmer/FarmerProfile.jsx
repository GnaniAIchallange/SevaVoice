import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  HelpCircle,
  MapPin,
  RefreshCw,
  Ruler,
  Save,
  ShieldAlert,
  Sprout,
  User,
  Volume2,
  VolumeX,
  Wheat,
} from "lucide-react";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

const VOICE_PREFERENCE_KEY = "sevavoice.voiceGuide";

function loadVoicePreference() {
  try {
    return window.localStorage.getItem(VOICE_PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

export default function FarmerProfile({ user, onProfileUpdated, onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profile, setProfile] = useState(null);

  // Form states
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || "en");
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(loadVoicePreference);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [landSizeAcres, setLandSizeAcres] = useState("");
  const [cropType, setCropType] = useState("");

  // Warning Modal State
  const [showWarningModal, setShowWarningModal] = useState(false);

  const t = getStrings(preferredLanguage);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const data = await farmerApi.getProfile();
      const p = data.profile;
      setProfile(p);
      setPreferredLanguage(p.preferredLanguage || "en");
      setName(p.name || "");
      setPhone(p.phone || "");
      setVillage(p.village || "");
      setDistrict(p.district || "");
      setState(p.state || "");
      setLandSizeAcres(p.landSizeAcres ? String(p.landSizeAcres) : "");
      setCropType(p.cropType || "");
    } catch (err) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function toggleVoicePreference() {
    const nextVal = !voiceGuideEnabled;
    setVoiceGuideEnabled(nextVal);
    try {
      window.localStorage.setItem(VOICE_PREFERENCE_KEY, nextVal ? "on" : "off");
    } catch {
      // Storage unavailable
    }
  }

  // Check if identity/land fields changed
  function hasIdentityOrLandChanges() {
    if (!profile) return false;
    return (
      name.trim() !== (profile.name || "") ||
      village.trim() !== (profile.village || "") ||
      district.trim() !== (profile.district || "") ||
      state.trim() !== (profile.state || "") ||
      Number(landSizeAcres) !== Number(profile.landSizeAcres || 0)
    );
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    // If verified and sensitive identity/land fields were edited, show clear verification warning modal
    if (profile?.farmerVerificationStatus === "verified" && hasIdentityOrLandChanges()) {
      setShowWarningModal(true);
      return;
    }

    void executeSave();
  }

  async function executeSave() {
    setShowWarningModal(false);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        preferredLanguage,
        cropType,
        name: name.trim(),
        village: village.trim(),
        district: district.trim(),
        state: state.trim(),
        landSizeAcres: Number(landSizeAcres) || undefined,
      };

      const result = await farmerApi.updateProfile(payload);
      setProfile(result.profile);
      setSuccess(result.message || t.profile.savedSuccess);

      // Notify parent to update user state if needed
      if (onProfileUpdated) {
        onProfileUpdated(result.profile);
      }
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        {onBack && (
          <button
            onClick={onBack}
            type="button"
            className="p-2.5 text-text-muted hover:text-primary bg-surface hover:bg-surface-muted rounded-2xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text font-serif">
            {t.profile.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {t.profile.subtitle}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[250px]" role="status">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-base text-text-muted">{t.common.loading}</p>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-danger-soft border border-danger/30 rounded-2xl text-sm text-danger-soft-text flex items-start gap-2.5" role="alert">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-success-soft border border-success/30 rounded-2xl text-sm text-success-soft-text flex items-start gap-2.5" role="alert">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Preferences Section: Language & Voice Guide */}
          <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <span>{t.profile.preferredLang}</span>
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {[
                { code: "mr", label: "मराठी" },
                { code: "hi", label: "हिंदी" },
                { code: "en", label: "English" },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPreferredLanguage(code)}
                  className={`py-3 px-2 rounded-xl text-sm font-bold border min-h-[48px] flex items-center justify-center transition-colors cursor-pointer ${
                    preferredLanguage === code
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface-muted text-text-muted border-border hover:bg-surface hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Default Voice Guide Toggle */}
            <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {voiceGuideEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-text-muted" />
                )}
                <div>
                  <p className="text-sm font-bold text-text">
                    {t.profile.voiceDefault}
                  </p>
                  <p className="text-xs text-text-muted">
                    {voiceGuideEnabled ? "Auto-play voice on" : "Muted by default"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleVoicePreference}
                className={`py-2 px-4 rounded-full text-xs font-bold border transition-colors min-h-[44px] cursor-pointer ${
                  voiceGuideEnabled
                    ? "bg-primary-soft text-primary-soft-text border-primary/30"
                    : "bg-surface-muted text-text-muted border-border"
                }`}
              >
                {voiceGuideEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Farm & Location Details */}
          <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <Sprout className="w-5 h-5 text-primary" />
              <span>{t.profile.farmDetailsTitle}</span>
            </h2>

            {/* Readonly Phone */}
            <div>
              <label htmlFor="farmer-phone" className="block text-xs font-bold text-text-muted mb-1">
                {t.profile.phone} (Permanent ID)
              </label>
              <input
                id="farmer-phone"
                type="text"
                value={phone}
                disabled
                className="w-full px-4 py-3 bg-surface-muted border border-border rounded-xl text-text-muted font-mono text-base min-h-[48px] cursor-not-allowed opacity-80"
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="farmer-name" className="block text-xs font-bold text-text mb-1">
                {t.profile.name}
              </label>
              <input
                id="farmer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Primary Crop (Safe field) */}
            <div>
              <label htmlFor="farmer-crop" className="block text-xs font-bold text-text mb-1">
                {t.profile.crop}
              </label>
              <input
                id="farmer-crop"
                type="text"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="e.g. Wheat, Sugarcane, Cotton"
                className="w-full px-4 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Land Size (Acres) */}
            <div>
              <label htmlFor="farmer-acres" className="block text-xs font-bold text-text mb-1">
                {t.profile.acres}
              </label>
              <input
                id="farmer-acres"
                type="number"
                step="0.1"
                min="0.1"
                max="10000"
                value={landSizeAcres}
                onChange={(e) => setLandSizeAcres(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Location fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="farmer-village" className="block text-xs font-bold text-text mb-1">
                  {t.profile.village}
                </label>
                <input
                  id="farmer-village"
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  required
                  className="w-full px-3 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="farmer-district" className="block text-xs font-bold text-text mb-1">
                  {t.profile.district}
                </label>
                <input
                  id="farmer-district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                  className="w-full px-3 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="farmer-state" className="block text-xs font-bold text-text mb-1">
                  {t.profile.state}
                </label>
                <input
                  id="farmer-state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className="w-full px-3 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 px-6 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-muted text-primary-foreground font-bold text-base rounded-2xl shadow-md flex items-center justify-center gap-2 min-h-[52px] cursor-pointer transition-all active:scale-98"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t.profile.saving}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{t.profile.saveChanges}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Verification Warning Dialog Modal */}
      {showWarningModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warning-modal-title"
        >
          <div className="bg-surface text-text rounded-3xl p-6 w-full max-w-md shadow-2xl border border-danger/30 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-danger mb-3">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h2 id="warning-modal-title" className="text-lg font-bold text-text font-serif">
                {t.profile.warningModalTitle}
              </h2>
            </div>

            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {t.profile.warningModalDesc}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 py-3 px-4 border border-border text-text-muted font-semibold text-sm rounded-xl min-h-[44px] hover:bg-surface-muted cursor-pointer"
              >
                {t.profile.cancelWarningBtn}
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="flex-1 py-3 px-4 bg-danger hover:opacity-90 text-danger-foreground font-bold text-sm rounded-xl min-h-[44px] shadow-xs cursor-pointer"
              >
                {t.profile.confirmWarningBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
