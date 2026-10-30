import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  HandHeart,
  HelpCircle,
  Mic,
  PlusCircle,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createVoiceApi } from "../../lib/voiceApi.js";
import { createVoiceRecorder } from "../../lib/voiceRecorder.js";
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

const CATEGORY_KEYS = [
  "seeds",
  "fertilizer",
  "equipment",
  "irrigation",
  "livestock",
  "medical",
  "other",
];

export default function NewRequestVoice({
  user,
  initialDraft,
  onBack,
  onSubmitted,
}) {
  const lang = user?.preferredLanguage || "en";
  const t = getStrings(lang);

  // Verification Gating Check
  const [checkingVerification, setCheckingVerification] = useState(
    !user?.farmerVerificationStatus && user?.canRequestHelp === undefined
  );
  const [isVerified, setIsVerified] = useState(
    user?.farmerVerificationStatus === "verified" ||
      user?.verificationStatus === "verified" ||
      user?.canRequestHelp === true
  );

  useEffect(() => {
    if (
      user?.farmerVerificationStatus === "verified" ||
      user?.verificationStatus === "verified" ||
      user?.canRequestHelp === true
    ) {
      setIsVerified(true);
      setCheckingVerification(false);
      return;
    }

    let isMounted = true;
    async function checkAccountVerification() {
      try {
        const dashboard = await farmerApi.getDashboard();
        if (isMounted && dashboard) {
          const verified =
            dashboard.farmer?.farmerVerificationStatus === "verified" ||
            dashboard.farmer?.verificationStatus === "verified" ||
            dashboard.canRequestHelp === true;
          setIsVerified(verified);
        }
      } catch (err) {
        if (isMounted) setIsVerified(false);
      } finally {
        if (isMounted) setCheckingVerification(false);
      }
    }
    checkAccountVerification();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Flow Phases: 'input' -> 'clarifying' -> 'review' -> 'submitting' -> 'done'
  const [phase, setPhase] = useState(initialDraft ? "review" : "input");
  const [draftId, setDraftId] = useState(initialDraft?.id || null);

  // Extracted request fields
  const [category, setCategory] = useState(initialDraft?.category || "");
  const [amountRequested, setAmountRequested] = useState(
    initialDraft?.amountRequested ? String(initialDraft.amountRequested) : "",
  );
  const [purpose, setPurpose] = useState(initialDraft?.purpose || "");
  const [urgency, setUrgency] = useState(
    initialDraft?.extractedFields?.urgency || "standard",
  );
  const [transcript, setTranscript] = useState(initialDraft?.transcript || "");

  // Voice recording & playback states
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(loadVoicePreference);
  const [voiceState, setVoiceState] = useState("idle"); // 'idle' | 'recording' | 'transcribing' | 'speaking'
  const [currentPrompt, setCurrentPrompt] = useState(t.newRequest.startPrompt);
  const [statusMessage, setStatusMessage] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [lastInputSource, setLastInputSource] = useState(null); // 'voice' | 'typed'
  const [missingFields, setMissingFields] = useState([]);
  const [editingFieldInReview, setEditingFieldInReview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Audio refs & helpers
  const audioRef = useRef(null);
  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRecTranscriptRef = useRef("");
  const mountedRef = useRef(true);
  const operationRef = useRef(0);
  const voiceGuideRef = useRef(voiceGuideEnabled);
  const voiceApi = useMemo(() => createVoiceApi(), []);

  useEffect(() => {
    mountedRef.current = true;
    voiceGuideRef.current = voiceGuideEnabled;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop error
      }
      recorderRef.current?.cancel();
      voiceApi.dispose(audioRef.current);
    };
  }, [voiceApi, voiceGuideEnabled]);

  // Read prompt on initial mount if voice guide enabled and verified
  useEffect(() => {
    if (isVerified && voiceGuideEnabled && phase === "input") {
      void playVoicePrompt(t.newRequest.startPrompt);
    }
  }, [isVerified]);

  function toggleVoiceGuide() {
    const nextVal = !voiceGuideRef.current;
    voiceGuideRef.current = nextVal;
    setVoiceGuideEnabled(nextVal);
    try {
      window.localStorage.setItem(VOICE_PREFERENCE_KEY, nextVal ? "on" : "off");
    } catch {
      // Storage unavailable
    }
    if (!nextVal) {
      voiceApi.stop(audioRef.current);
      setVoiceState("idle");
    }
  }

  async function playVoicePrompt(text) {
    if (!voiceGuideRef.current || !text) return;
    try {
      setVoiceState("speaking");
      await voiceApi.speak(audioRef.current, lang, text);
    } catch {
      // Audio playback interrupted
    } finally {
      if (mountedRef.current) {
        setVoiceState("idle");
      }
    }
  }

  // Record speech from farmer
  async function startRecording() {
    if (voiceState === "recording" || voiceState === "transcribing") return;

    voiceApi.stop(audioRef.current);
    setStatusMessage("");
    setVoiceState("recording");

    const op = operationRef.current + 1;
    operationRef.current = op;

    // Start browser SpeechRecognition in parallel if available as a fallback
    speechRecTranscriptRef.current = "";
    const SpeechRecClass =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (SpeechRecClass) {
      try {
        const recognition = new SpeechRecClass();
        recognition.lang =
          lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          let text = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            text += event.results[i][0].transcript + " ";
          }
          if (text.trim()) {
            speechRecTranscriptRef.current = (
              speechRecTranscriptRef.current + " " + text
            ).trim();
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Fallback recognition start is non-blocking
      }
    }

    const recorder = createVoiceRecorder({
      maxDurationMs: 30000,
      onRecordingChange(isRec) {
        if (!isRec && mountedRef.current && operationRef.current === op) {
          setVoiceState("transcribing");
        }
      },
    });
    recorderRef.current = recorder;

    try {
      const audioBlob = await recorder.start();
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop error
      }
      if (!mountedRef.current || operationRef.current !== op) return;

      recorderRef.current = null;
      setVoiceState("transcribing");

      let transcription = "";
      try {
        transcription = await voiceApi.transcribe(audioBlob, lang);
      } catch {
        // Backend STT error; will check browser SpeechRecognition fallback below
      }

      if (!transcription || transcription.trim().length === 0) {
        transcription = speechRecTranscriptRef.current?.trim() || "";
      }

      if (!mountedRef.current || operationRef.current !== op) return;

      if (!transcription || transcription.trim().length === 0) {
        setStatusMessage(t.newRequest.emptyVoiceError || t.newRequest.emptyTranscriptError);
        setVoiceState("idle");
        return;
      }

      setTranscript((prev) => (prev ? `${prev} ${transcription}` : transcription));
      setLastInputSource("voice");

      // Process input
      await handleProcessInput(transcription, "voice");
    } catch (err) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop error
      }
      if (!mountedRef.current || operationRef.current !== op) return;
      recorderRef.current = null;

      const fallbackText = speechRecTranscriptRef.current?.trim();
      if (fallbackText) {
        setTranscript((prev) => (prev ? `${prev} ${fallbackText}` : fallbackText));
        setLastInputSource("voice");
        await handleProcessInput(fallbackText, "voice");
        return;
      }

      setVoiceState("idle");

      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setStatusMessage(t.newRequest.micDeniedError);
      } else if (err.name !== "AbortError") {
        setStatusMessage("Could not capture speech. Please type your request below.");
      }
    }
  }

  function handleMicClick() {
    if (voiceState === "speaking") {
      voiceApi.stop(audioRef.current);
      setVoiceState("idle");
      return;
    }
    if (voiceState === "recording") {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop error
      }
      recorderRef.current?.stop();
    } else {
      void startRecording();
    }
  }

  // Common input processing: calls LLM extraction endpoint
  async function handleProcessInput(inputContent, source = "typed") {
    const textToProcess = inputContent || typedInput;
    if (!textToProcess || textToProcess.trim().length === 0) return;

    setStatusMessage("");
    setVoiceState("transcribing");

    try {
      const currentFields = {
        category: category || undefined,
        amountRequested: amountRequested ? Number(amountRequested) : undefined,
        purpose: purpose || undefined,
        urgency,
      };

      const extracted = await farmerApi.extractRequest({
        transcript: textToProcess,
        language: lang,
        currentFields,
      });

      const nextCategory = extracted.category || category;
      const nextAmount = extracted.amountRequested ? String(extracted.amountRequested) : amountRequested;
      const nextPurpose = extracted.purpose || purpose || textToProcess;
      const nextUrgency = extracted.urgency || urgency;

      setCategory(nextCategory);
      setAmountRequested(nextAmount);
      setPurpose(nextPurpose);
      setUrgency(nextUrgency);
      setMissingFields(extracted.missingFields || []);

      // Autosave draft server-side
      void autosaveDraft({
        category: nextCategory,
        amountRequested: nextAmount ? Number(nextAmount) : undefined,
        purpose: nextPurpose,
        urgency: nextUrgency,
        transcript: textToProcess,
        extractedFields: extracted,
      });

      setTypedInput("");
      setVoiceState("idle");

      // If all fields are populated, move to review screen!
      if (extracted.isComplete) {
        setPhase("review");
        void playVoicePrompt(t.newRequest.reviewSubtitle);
      } else {
        // Need clarification on missing fields
        setPhase("clarifying");
        const nextQuestion = extracted.followUpQuestion || t.newRequest.missingNotice;
        setCurrentPrompt(nextQuestion);
        void playVoicePrompt(nextQuestion);
      }
    } catch {
      setVoiceState("idle");
      setStatusMessage("Could not process request. Please check the values and proceed.");
      // Fallback to review screen so user can edit manually
      setPhase("review");
    }
  }

  // Autosave draft
  async function autosaveDraft(fields) {
    try {
      const result = await farmerApi.saveDraft({
        requestId: draftId,
        category: fields.category,
        amountRequested: fields.amountRequested,
        purpose: fields.purpose,
        urgency: fields.urgency,
        transcript: fields.transcript,
        extractedFields: fields.extractedFields,
        language: lang,
      });
      if (result.request?.id) {
        setDraftId(result.request.id);
      }
    } catch {
      // Autosave is non-blocking
    }
  }

  // Final confirmed submission
  async function handleFinalSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    const numAmount = Number(amountRequested);
    if (!category || isNaN(numAmount) || numAmount <= 0 || !purpose || purpose.trim().length < 5) {
      setSubmitError("Please fill out category, amount and purpose before submitting.");
      setIsSubmitting(false);
      return;
    }

    try {
      await farmerApi.submitRequest({
        requestId: draftId,
        category,
        amountRequested: numAmount,
        purpose: purpose.trim(),
        urgency,
        transcript,
        language: lang,
      });

      setPhase("done");
      if (onSubmitted) {
        setTimeout(onSubmitted, 1800);
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to submit assistance request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // If checking verification status from backend, show loading spinner
  if (checkingVerification) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]" role="status">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-base text-text-muted">{t.common.loading}</p>
      </div>
    );
  }

  // If farmer is NOT verified, render plain-language gating block
  if (!isVerified) {
    return (
      <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-4 text-center">
        <div className="p-8 bg-warning-soft border-2 border-warning/40 rounded-3xl shadow-xs">
          <ShieldAlert className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-xl font-bold text-warning-soft-text mb-2 font-serif">
            {t.newRequest.gatedTitle}
          </h1>
          <p className="text-sm text-warning-soft-text/90 max-w-md mx-auto leading-relaxed mb-6">
            {t.newRequest.gatedDesc}
          </p>
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm rounded-xl min-h-[48px] shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.newRequest.backToHome}</span>
          </button>
        </div>
      </div>
    );
  }

  // Audio element for TTS playback
  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Hidden audio element for browser voice playback */}
      <audio ref={audioRef} className="hidden" preload="auto" />

      {/* Top Bar with Voice On/Off toggle */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button
          onClick={onBack}
          type="button"
          className="p-2.5 text-text-muted hover:text-primary bg-surface hover:bg-surface-muted rounded-2xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-bold text-text font-serif">
          {t.newRequest.title}
        </h1>

        <button
          onClick={toggleVoiceGuide}
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors min-h-[44px] cursor-pointer ${
            voiceGuideEnabled
              ? "bg-primary-soft text-primary-soft-text border-primary/30"
              : "bg-surface-muted text-text-muted border-border"
          }`}
          aria-label={voiceGuideEnabled ? t.newRequest.voiceGuideOn : t.newRequest.voiceGuideOff}
        >
          {voiceGuideEnabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-text-muted" />
          )}
          <span className="hidden sm:inline">
            {voiceGuideEnabled ? "Voice Guide ON" : "Voice OFF"}
          </span>
        </button>
      </div>

      {/* Phase 1 & 2: Voice & Typing Input Screen */}
      {(phase === "input" || phase === "clarifying") && (
        <div className="space-y-6">
          {/* Spoken Guidance Prompt Box */}
          <div className="bg-surface border border-border rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Voice Guidance</span>
              </span>

              {voiceGuideEnabled && (
                <button
                  onClick={() => {
                    if (voiceState === "speaking") {
                      voiceApi.stop(audioRef.current);
                      setVoiceState("idle");
                    } else {
                      playVoicePrompt(currentPrompt);
                    }
                  }}
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 min-h-[44px] cursor-pointer"
                >
                  {voiceState === "speaking" ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-accent animate-pulse" />
                      <span className="text-accent font-bold">Stop Speaking</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{t.newRequest.listenAgain}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-base sm:text-lg font-semibold text-text leading-relaxed">
              {currentPrompt}
            </p>
          </div>

          {/* Microphone Card (Mobile first, large 44px+ touch targets) */}
          <div className="bg-surface border border-border rounded-3xl p-6 text-center shadow-xs space-y-4">
            <div className="flex flex-col items-center justify-center">
              <button
                onClick={handleMicClick}
                type="button"
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                  voiceState === "recording"
                    ? "bg-danger text-danger-foreground animate-pulse ring-8 ring-danger/20"
                    : voiceState === "transcribing"
                    ? "bg-accent text-accent-foreground animate-spin"
                    : voiceState === "speaking"
                    ? "bg-primary-soft text-primary ring-8 ring-primary/20 animate-pulse"
                    : "bg-primary hover:bg-primary-hover text-primary-foreground active:scale-95 ring-8 ring-primary/20"
                }`}
                aria-label={
                  voiceState === "recording"
                    ? t.newRequest.stopBtn
                    : voiceState === "speaking"
                    ? "Stop speaking"
                    : t.newRequest.speakBtn
                }
              >
                {voiceState === "recording" ? (
                  <Square className="w-10 h-10 fill-current" />
                ) : voiceState === "transcribing" ? (
                  <RefreshCw className="w-10 h-10 animate-spin" />
                ) : voiceState === "speaking" ? (
                  <Volume2 className="w-10 h-10 animate-bounce text-primary" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>

              <p className="text-sm font-bold text-text mt-4">
                {voiceState === "recording"
                  ? t.newRequest.listening
                  : voiceState === "transcribing"
                  ? t.newRequest.processing
                  : voiceState === "speaking"
                  ? "Speaking guidance..."
                  : t.newRequest.speakBtn}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {voiceState === "recording"
                  ? "Tap square when done"
                  : voiceState === "speaking"
                  ? "Tap to pause/stop speaking"
                  : "Tap microphone to speak in your language"}
              </p>
            </div>

            {statusMessage && (
              <div className="p-3.5 bg-warning-soft border border-warning/30 rounded-xl text-xs text-warning-soft-text flex items-start gap-2 text-left" role="alert">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Typing Fallback: Farmer can type or speak at any step */}
          <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs space-y-3">
            <label htmlFor="farmer-typing-input" className="block text-xs font-bold text-text">
              {t.newRequest.typingFallbackPrompt}
            </label>
            <textarea
              id="farmer-typing-input"
              rows={3}
              value={typedInput}
              onChange={(e) => {
                setTypedInput(e.target.value);
                setLastInputSource("typed");
              }}
              placeholder={t.newRequest.typingPlaceholder}
              className="w-full px-4 py-3 bg-surface-muted/60 border border-border rounded-2xl text-text text-base min-h-[96px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              onClick={() => handleProcessInput(typedInput, "typed")}
              disabled={!typedInput.trim() || voiceState === "recording"}
              type="button"
              className="w-full py-3.5 px-5 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-muted text-primary-foreground font-bold text-base rounded-xl shadow-xs flex items-center justify-center gap-2 min-h-[48px] cursor-pointer transition-colors"
            >
              <span>{t.newRequest.proceedBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: Review Screen (Structured details editable before submit) */}
      {phase === "review" && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
            <h2 className="text-base font-bold text-text font-serif">
              {t.newRequest.reviewTitle}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t.newRequest.reviewSubtitle}
            </p>
          </div>

          {submitError && (
            <div className="p-4 bg-danger-soft border border-danger/30 rounded-2xl text-sm text-danger-soft-text flex items-start gap-2.5" role="alert">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Structured Fields */}
          <div className="space-y-3">
            {/* 1. Category */}
            <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t.newRequest.categoryLabel}
                </p>
                <p className="text-base font-bold text-text mt-0.5">
                  {t.categories[category] || category || "Please select a category"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFieldInReview(editingFieldInReview === "category" ? null : "category")}
                className="p-2.5 text-primary hover:bg-surface-muted rounded-xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {editingFieldInReview === "category" && (
              <div className="p-4 bg-surface-muted rounded-2xl border border-border grid grid-cols-2 gap-2">
                {CATEGORY_KEYS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setEditingFieldInReview(null);
                    }}
                    className={`p-3 rounded-xl text-xs font-bold text-left border min-h-[44px] transition-colors cursor-pointer ${
                      category === cat
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-surface text-text border-border hover:bg-surface-muted"
                    }`}
                  >
                    {t.categories[cat] || cat}
                  </button>
                ))}
              </div>
            )}

            {/* 2. Amount */}
            <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t.newRequest.amountLabel}
                </p>
                <p className="text-2xl font-black text-text mt-0.5">
                  {amountRequested ? `₹${Number(amountRequested).toLocaleString("en-IN")}` : "Not specified"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFieldInReview(editingFieldInReview === "amount" ? null : "amount")}
                className="p-2.5 text-primary hover:bg-surface-muted rounded-xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {editingFieldInReview === "amount" && (
              <div className="p-4 bg-surface-muted rounded-2xl border border-border space-y-2">
                <label htmlFor="edit-amount" className="block text-xs font-bold text-text">
                  Enter Requested Amount in Rupees (₹)
                </label>
                <input
                  id="edit-amount"
                  type="number"
                  min="500"
                  step="100"
                  value={amountRequested}
                  onChange={(e) => setAmountRequested(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setEditingFieldInReview(null)}
                  className="mt-2 py-2 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl min-h-[44px] cursor-pointer"
                >
                  Save Amount
                </button>
              </div>
            )}

            {/* 3. Purpose */}
            <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t.newRequest.purposeLabel}
                </p>
                <p className="text-sm text-text mt-1 leading-relaxed">
                  {purpose || "Not specified"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFieldInReview(editingFieldInReview === "purpose" ? null : "purpose")}
                className="p-2.5 text-primary hover:bg-surface-muted rounded-xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {editingFieldInReview === "purpose" && (
              <div className="p-4 bg-surface-muted rounded-2xl border border-border space-y-2">
                <label htmlFor="edit-purpose" className="block text-xs font-bold text-text">
                  Edit Purpose Description
                </label>
                <textarea
                  id="edit-purpose"
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text text-base min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setEditingFieldInReview(null)}
                  className="mt-2 py-2 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl min-h-[44px] cursor-pointer"
                >
                  Save Purpose
                </button>
              </div>
            )}

            {/* 4. Urgency */}
            <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t.newRequest.urgencyLabel}
                </p>
                <p className="text-sm font-bold text-text mt-0.5">
                  {urgency === "urgent" ? t.newRequest.urgentLevel : t.newRequest.standardUrgency}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency("standard")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold min-h-[44px] border cursor-pointer transition-colors ${
                    urgency === "standard"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface-muted text-text-muted border-border hover:bg-surface"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency("urgent")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold min-h-[44px] border cursor-pointer transition-colors ${
                    urgency === "urgent"
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-surface-muted text-text-muted border-border hover:bg-surface"
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              type="button"
              className="w-full py-4 px-6 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-muted text-primary-foreground font-extrabold text-base rounded-2xl shadow-md flex items-center justify-center gap-3 min-h-[56px] cursor-pointer transition-all active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{t.newRequest.submitting}</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>{t.newRequest.confirmAndSubmit}</span>
                </>
              )}
            </button>

            <button
              onClick={() => setPhase("input")}
              type="button"
              className="w-full py-3 px-4 border border-border text-text-muted font-semibold text-sm rounded-xl min-h-[44px] hover:bg-surface-muted cursor-pointer transition-colors"
            >
              Add More Voice Details
            </button>
          </div>
        </div>
      )}

      {/* Phase 4: Done Screen */}
      {phase === "done" && (
        <div className="p-8 bg-success-soft border border-success/30 rounded-3xl text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h2 className="text-xl font-bold text-success-soft-text font-serif">
            Request Submitted Successfully!
          </h2>
          <p className="text-sm text-success-soft-text/90 leading-relaxed max-w-md mx-auto">
            {t.newRequest.submissionSuccess}
          </p>
          <button
            onClick={onBack}
            type="button"
            className="mt-4 px-6 py-3 bg-success text-success-foreground hover:opacity-90 font-bold text-sm rounded-xl min-h-[44px] shadow-xs cursor-pointer"
          >
            <span>{t.newRequest.backToHome}</span>
          </button>
        </div>
      )}
    </div>
  );
}
