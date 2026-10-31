import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Loader2,
  LogIn,
  RotateCcw,
  Sparkles,
  Sprout,
  UserPlus,
  Volume2,
  VolumeX,
  Wheat,
  X,
} from "lucide-react";
import { createVoiceApi } from "../lib/voiceApi.js";
import "./FarmerWelcomeModal.css";

const LANGUAGES = [
  { code: "mr-IN", key: "mr", name: "मराठी", label: "मराठी" },
  { code: "hi-IN", key: "hi", name: "हिंदी", label: "हिंदी" },
  { code: "en-IN", key: "en", name: "English", label: "English" },
];

const STEP1_QUESTIONS = {
  "mr-IN": "तुम्ही शेतकरी आहात का?",
  "hi-IN": "क्या आप एक किसान हैं?",
  "en-IN": "Are you a farmer?",
};

const STEP1_YES = {
  "mr-IN": "होय, मी शेतकरी आहे",
  "hi-IN": "हाँ, मैं किसान हूँ",
  "en-IN": "Yes, I am a Farmer",
};

const STEP1_NO = {
  "mr-IN": "नाही, मी शेतकरी नाही",
  "hi-IN": "नहीं, मैं किसान नहीं हूँ",
  "en-IN": "No, I am not a Farmer",
};

const STEP2_MESSAGES = {
  "mr-IN": "सेवाव्हाइसमध्ये आपले स्वागत आहे! आपण काय करू इच्छिता?",
  "hi-IN": "सेवावॉइस में आपका स्वागत है! आप क्या करना चाहते हैं?",
  "en-IN": "Welcome to SevaVoice! What would you like to do?",
};

export default function FarmerWelcomeModal({
  isOpen,
  onClose,
  onNavigate,
}) {
  const [step, setStep] = useState(1); // 1 = Farmer question, 2 = Welcome & Choose Login/Register
  const [currentLangIndex, setCurrentLangIndex] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const audioRef = useRef(null);
  const voiceApiRef = useRef(null);
  const sequenceIdRef = useRef(0);

  // Initialize voice API client once
  if (!voiceApiRef.current) {
    voiceApiRef.current = createVoiceApi();
  }

  // Stop any playing audio
  const stopAudio = () => {
    sequenceIdRef.current += 1;
    if (voiceApiRef.current && audioRef.current) {
      voiceApiRef.current.stop(audioRef.current);
    }
    setIsPlaying(false);
    setIsGenerating(false);
    setCurrentLangIndex(-1);
  };

  // Play sequential voice announcements for the given step
  const playStepAudio = async (targetStep = step) => {
    stopAudio();
    const currentSeq = ++sequenceIdRef.current;
    setAutoplayBlocked(false);

    const items =
      targetStep === 1
        ? LANGUAGES.map((lang) => ({
            code: lang.code,
            text: STEP1_QUESTIONS[lang.code],
          }))
        : LANGUAGES.map((lang) => ({
            code: lang.code,
            text: STEP2_MESSAGES[lang.code],
          }));

    for (let i = 0; i < items.length; i++) {
      if (sequenceIdRef.current !== currentSeq) break;

      setCurrentLangIndex(i);
      setIsGenerating(true);
      setIsPlaying(false);

      try {
        if (!audioRef.current || !voiceApiRef.current) break;

        const speakPromise = voiceApiRef.current.speak(
          audioRef.current,
          items[i].code,
          items[i].text,
        );

        setIsGenerating(false);
        setIsPlaying(true);

        await speakPromise;

        if (sequenceIdRef.current !== currentSeq) break;
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (err.name === "NotAllowedError") {
          setAutoplayBlocked(true);
          setIsPlaying(false);
          setIsGenerating(false);
          setCurrentLangIndex(-1);
          return;
        }
      }
    }

    if (sequenceIdRef.current === currentSeq) {
      setIsPlaying(false);
      setIsGenerating(false);
      setCurrentLangIndex(-1);
    }
  };

  // Play a specific chosen language on-demand
  const playSingleLanguage = async (idx) => {
    stopAudio();
    const currentSeq = ++sequenceIdRef.current;
    setAutoplayBlocked(false);
    setCurrentLangIndex(idx);
    setIsGenerating(true);
    setIsPlaying(false);

    const lang = LANGUAGES[idx];
    const text = step === 1 ? STEP1_QUESTIONS[lang.code] : STEP2_MESSAGES[lang.code];

    try {
      if (!audioRef.current || !voiceApiRef.current) return;
      const speakPromise = voiceApiRef.current.speak(
        audioRef.current,
        lang.code,
        text,
      );
      setIsGenerating(false);
      setIsPlaying(true);
      await speakPromise;
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setAutoplayBlocked(true);
      }
    } finally {
      if (sequenceIdRef.current === currentSeq) {
        setIsPlaying(false);
        setIsGenerating(false);
        setCurrentLangIndex(-1);
      }
    }
  };


  // On modal open or step transition, auto-play the 3 languages sequentially
  useEffect(() => {
    if (isOpen) {
      playStepAudio(step);
    } else {
      stopAudio();
      setStep(1);
    }

    return () => {
      stopAudio();
    };
  }, [isOpen, step]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (voiceApiRef.current && audioRef.current) {
        voiceApiRef.current.dispose(audioRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Actions
  const handleClose = () => {
    stopAudio();
    sessionStorage.setItem("seva-welcome-seen", "true");
    onClose();
  };

  const handleStep1Yes = () => {
    stopAudio();
    setStep(2);
  };

  const handleStep1No = () => {
    stopAudio();
    sessionStorage.setItem("seva-welcome-seen", "true");
    onClose();
  };

  const handleStep2Back = () => {
    stopAudio();
    setStep(1);
  };

  const handleGoLogin = () => {
    stopAudio();
    sessionStorage.setItem("seva-welcome-seen", "true");
    onClose();
    onNavigate("/login");
  };

  const handleGoRegister = () => {
    stopAudio();
    sessionStorage.setItem("seva-welcome-seen", "true");
    onClose();
    onNavigate("/register/farmer");
  };

  return (
    <div
      className="farmer-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <audio ref={audioRef} preload="auto" className="hidden" />

      <div className="farmer-modal-container p-6 sm:p-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-primary tracking-tight">
                SevaVoice
              </span>
              <p className="text-[11px] font-medium text-text-muted">
                शेतकरी सहाय्य मंच • Farmer Assistance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hear Again button */}
            <button
              type="button"
              onClick={() => playStepAudio(step)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface-muted hover:bg-primary-soft text-text hover:text-primary transition-colors border border-border"
              title="पुन्हा आवाज ऐका / Hear Again"
              aria-label="Hear voice announcement again"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hear Again</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              aria-label="Close welcome modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multilingual Voice Indicator Bar */}
        <div className="my-4 p-3 rounded-2xl bg-surface-muted/60 border border-border/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-text-muted">
              {isPlaying ? (
                <div className="sound-wave text-primary">
                  <span className="sound-wave-bar"></span>
                  <span className="sound-wave-bar"></span>
                  <span className="sound-wave-bar"></span>
                  <span className="sound-wave-bar"></span>
                </div>
              ) : isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-text-muted" />
              )}
              <span>
                {isPlaying
                  ? `Speaking (${LANGUAGES[currentLangIndex]?.name || ""})...`
                  : isGenerating
                  ? "Loading voice..."
                  : "Voice Announcement"}
              </span>
            </div>

            {/* Interactive language buttons */}
            <div className="flex items-center gap-1.5">
              {LANGUAGES.map((lang, idx) => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => playSingleLanguage(idx)}
                  className={`voice-indicator-pill px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    currentLangIndex === idx && (isPlaying || isGenerating)
                      ? "active ring-2 ring-primary/40 bg-primary-soft text-primary font-bold shadow-xs"
                      : "bg-surface border-border text-text hover:border-primary/50 hover:bg-surface-muted"
                  }`}
                  title={`Listen in ${lang.name} / ${lang.label} ऐका`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Autoplay block prompt if browser blocked autoplay */}
          {autoplayBlocked && (
            <button
              type="button"
              onClick={() => playStepAudio(step)}
              className="w-full mt-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-pulse hover:bg-primary-hover transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span>🔊 आवाज ऐकण्यासाठी येथे टॅप करा (Tap to hear)</span>
            </button>
          )}
        </div>

        {/* STEP 1: Are you a farmer? */}
        {step === 1 && (
          <div className="flex flex-col gap-6 py-2">
            {/* Friendly Farming Visual & Question */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto shadow-sm ring-8 ring-emerald-50/50 dark:ring-emerald-950/20">
                <Wheat className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => playSingleLanguage(0)}
                  className={`w-full text-center block text-2xl sm:text-3xl font-extrabold tracking-tight transition-all cursor-pointer hover:text-primary ${
                    currentLangIndex === 0 && isPlaying
                      ? "text-primary scale-102"
                      : "text-text"
                  }`}
                  title="मराठीमध्ये ऐका / Listen in Marathi"
                >
                  तुम्ही शेतकरी आहात का?
                </button>
                <button
                  type="button"
                  onClick={() => playSingleLanguage(1)}
                  className={`w-full text-center block text-lg sm:text-xl font-bold transition-all cursor-pointer hover:text-primary ${
                    currentLangIndex === 1 && isPlaying
                      ? "text-primary scale-102"
                      : "text-text/80"
                  }`}
                  title="हिंदी में सुनें / Listen in Hindi"
                >
                  क्या आप एक किसान हैं?
                </button>
                <button
                  type="button"
                  onClick={() => playSingleLanguage(2)}
                  className={`w-full text-center block text-sm sm:text-base font-semibold transition-all cursor-pointer hover:text-primary ${
                    currentLangIndex === 2 && isPlaying
                      ? "text-primary scale-102"
                      : "text-text-muted"
                  }`}
                  title="Listen in English"
                >
                  Are you a farmer?
                </button>
              </div>
            </div>

            {/* Large Touch-Friendly Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Option 1: Yes, I am a farmer */}
              <button
                type="button"
                onClick={handleStep1Yes}
                className="group p-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center text-center gap-2 border-2 border-primary active:scale-98 focus:outline-none focus:ring-4 focus:ring-primary/20"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-extrabold text-lg sm:text-xl leading-tight">
                    होय, मी शेतकरी आहे
                  </div>
                  <div className="font-bold text-sm text-primary-foreground/90">
                    हाँ, मैं किसान हूँ
                  </div>
                  <div className="text-xs font-semibold text-primary-foreground/80">
                    Yes, I am a Farmer
                  </div>
                </div>
              </button>

              {/* Option 2: No, I am not a farmer */}
              <button
                type="button"
                onClick={handleStep1No}
                className="group p-5 rounded-2xl bg-surface hover:bg-surface-muted text-text hover:text-primary transition-all flex flex-col items-center justify-center text-center gap-2 border-2 border-border hover:border-primary/50 active:scale-98 focus:outline-none focus:ring-4 focus:ring-border/40"
              >
                <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-base sm:text-lg text-text leading-tight">
                    नाही, मी शेतकरी नाही
                  </div>
                  <div className="font-semibold text-xs sm:text-sm text-text-muted">
                    नहीं, मैं किसान नहीं हूँ
                  </div>
                  <div className="text-xs text-text-muted/80">
                    No, I am not a Farmer (I want to donate)
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Welcome & Choose Login vs Register */}
        {step === 2 && (
          <div className="flex flex-col gap-6 py-2">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-soft text-primary mx-auto ring-6 ring-primary-soft/50">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => playSingleLanguage(0)}
                  className={`w-full text-center block text-xl sm:text-2xl font-extrabold tracking-tight transition-all cursor-pointer hover:text-primary ${
                    currentLangIndex === 0 && isPlaying
                      ? "text-primary"
                      : "text-text"
                  }`}
                  title="मराठीमध्ये ऐका / Listen in Marathi"
                >
                  सेवाव्हाइसमध्ये आपले स्वागत आहे!
                </button>
                <button
                  type="button"
                  onClick={() => playSingleLanguage(1)}
                  className={`w-full text-center block text-base sm:text-lg font-bold transition-all cursor-pointer hover:text-primary ${
                    currentLangIndex === 1 && isPlaying
                      ? "text-primary"
                      : "text-text/80"
                  }`}
                  title="हिंदी में सुनें / Listen in Hindi"
                >
                  सेवावॉइस में आपका स्वागत है!
                </button>
                <button
                  type="button"
                  onClick={() => playSingleLanguage(2)}
                  className={`w-full text-center block text-sm font-semibold transition-all cursor-pointer hover:text-primary ${
                    currentLangIndex === 2 && isPlaying
                      ? "text-primary"
                      : "text-text-muted"
                  }`}
                  title="Listen in English"
                >
                  Welcome to SevaVoice! What would you like to do?
                </button>
              </div>
            </div>

            {/* Choose Login or Registration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Option 2A: Already have an account -> Login */}
              <button
                type="button"
                onClick={handleGoLogin}
                className="group p-5 rounded-2xl bg-surface hover:bg-primary-soft/40 border-2 border-border hover:border-primary text-text transition-all flex flex-col items-center justify-center text-center gap-2.5 active:scale-98 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <LogIn className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-base sm:text-lg text-text">
                    माझे आधीच खाते आहे
                  </div>
                  <div className="font-bold text-sm text-primary">
                    लॉगिन करा (Login)
                  </div>
                  <div className="text-xs text-text-muted">
                    मेरा पहले से खाता है / I Have an Account
                  </div>
                </div>
              </button>

              {/* Option 2B: New to SevaVoice -> Farmer Registration */}
              <button
                type="button"
                onClick={handleGoRegister}
                className="group p-5 rounded-2xl bg-primary-soft/30 hover:bg-primary-soft border-2 border-primary/40 hover:border-primary text-text transition-all flex flex-col items-center justify-center text-center gap-2.5 active:scale-98 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-105 transition-all shadow-sm">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-base sm:text-lg text-text">
                    मी नवीन शेतकरी आहे
                  </div>
                  <div className="font-bold text-sm text-primary">
                    नोंदणी करा (Register)
                  </div>
                  <div className="text-xs text-text-muted">
                    मैं नया किसान हूँ / New Farmer Registration
                  </div>
                </div>
              </button>
            </div>

            {/* Back button to Step 1 */}
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleStep2Back}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors border border-border"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>मागे जा / Back</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
