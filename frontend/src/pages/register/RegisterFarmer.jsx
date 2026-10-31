import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Languages,
  Loader2,
  Map,
  MapPin,
  Mic,
  Phone,
  RotateCcw,
  Ruler,
  Sprout,
  Square,
  User,
  Volume2,
  VolumeX,
  Wheat,
  XCircle,
} from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";
import {
  FARMER_REGISTRATION_FIELDS,
  FARMER_REGISTRATION_LANGUAGES,
  getFarmerValidationMessage,
  normalize,
  parseConfirmationResponse,
  phoneDigitCount,
  phoneReadback,
  validateFarmerAnswer,
} from "../../lib/farmerRegistrationSteps.js";
import { createVoiceApi } from "../../lib/voiceApi.js";
import { createVoiceRecorder } from "../../lib/voiceRecorder.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const VOICE_PREFERENCE_KEY = "sevavoice.voiceGuide";
const FIELD_ICONS = {
  name: User,
  phone: Phone,
  village: MapPin,
  district: Map,
  state: Map,
  acres: Ruler,
  crop: Wheat,
};

function loadVoicePreference() {
  try {
    return window.localStorage.getItem(VOICE_PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

function RegisterFarmer({ onNavigate }) {
  const [language, setLanguage] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState("language");
  const [answers, setAnswers] = useState({});
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [answerSource, setAnswerSource] = useState(null);
  const [validationErrorCode, setValidationErrorCode] = useState(null);
  const [confirmState, setConfirmState] = useState("idle");
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(loadVoicePreference);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFiles, setDocumentFiles] = useState({
    aadhaarDocument: null,
    landDocument: null,
    supportingDocuments: [],
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationKey] = useState(() => crypto.randomUUID());
  const [documentVoicePhase, setDocumentVoicePhase] = useState("idle");
  const [documentVoiceStatus, setDocumentVoiceStatus] = useState("");
  const audioRef = useRef(null);
  const recorderRef = useRef(null);
  const mountedRef = useRef(true);
  const phaseRef = useRef("language");
  const operationRef = useRef(0);
  const advanceLockRef = useRef(false);
  const lastSpokenErrorRef = useRef(null);
  const voiceGuideRef = useRef(voiceGuideEnabled);
  const voiceApi = useMemo(() => createVoiceApi(), []);
  const languageConfig = language
    ? FARMER_REGISTRATION_LANGUAGES[language]
    : null;
  const field = FARMER_REGISTRATION_FIELDS[stepIndex];
  const step = languageConfig?.steps[field];
  function changePhase(nextPhase) {
    phaseRef.current = nextPhase;
    if (mountedRef.current) {
      setPhase(nextPhase);
    }
  }

  useEffect(() => {
    const audioElement = audioRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      recorderRef.current?.cancel();
      voiceApi.dispose(audioElement);
    };
  }, [voiceApi]);

  async function playSpeech(
    text,
    { automatic = true, languageOverride = language } = {},
  ) {
    if (
      !languageOverride ||
      (automatic &&
        (!voiceGuideRef.current ||
          ["requesting", "recording"].includes(phaseRef.current)))
    ) {
      return false;
    }
    try {
      await voiceApi.speak(audioRef.current, languageOverride, text);
      return true;
    } catch (error) {
      if (
        mountedRef.current &&
        error.name !== "AbortError" &&
        languageOverride
      ) {
        setStatus(
          FARMER_REGISTRATION_LANGUAGES[languageOverride].actions.voiceFallback,
        );
      }
      return false;
    }
  }

  function toggleVoiceGuide() {
    const nextEnabled = !voiceGuideRef.current;
    voiceGuideRef.current = nextEnabled;
    setVoiceGuideEnabled(nextEnabled);
    try {
      window.localStorage.setItem(
        VOICE_PREFERENCE_KEY,
        nextEnabled ? "on" : "off",
      );
    } catch {
      // Storage may be disabled by the browser.
    }
    if (!nextEnabled) {
      voiceApi.stop(audioRef.current);
      if (phaseRef.current === "speaking") {
        changePhase("ready");
      }
    }
  }

  async function chooseLanguage(selectedLanguage) {
    if (phaseRef.current !== "language") {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    voiceApi.stop(audioRef.current);
    setLanguage(selectedLanguage);
    setStatus("");
    changePhase("speaking");

    const config = FARMER_REGISTRATION_LANGUAGES[selectedLanguage];
    if (voiceGuideRef.current) {
      try {
        await voiceApi.speak(audioRef.current, selectedLanguage, config.intro);
      } catch (error) {
        if (error.name !== "AbortError" && mountedRef.current) {
          setStatus(config.actions.voiceFallback);
        }
      }
      if (
        mountedRef.current &&
        operationRef.current === operation &&
        voiceGuideRef.current
      ) {
        await playSpeech(config.steps[FARMER_REGISTRATION_FIELDS[0]].prompt, {
          languageOverride: selectedLanguage,
        });
      }
    }

    if (mountedRef.current && operationRef.current === operation) {
      changePhase("ready");
    }
  }

  function listenTo(text) {
    if (!language) {
      return;
    }
    void playSpeech(text, { automatic: false });
  }

  async function startRecording() {
    if (
      !language ||
      isSubmitting ||
      ["requesting", "recording", "transcribing", "documents", "done"].includes(
        phaseRef.current,
      )
    ) {
      return;
    }

    voiceApi.stop(audioRef.current);
    setStatus("");
    setAnswerSource(null);
    setValidationErrorCode(null);
    lastSpokenErrorRef.current = null;
    setValue("");
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    changePhase("requesting");

    const recorder = createVoiceRecorder({
      maxDurationMs: 25000,
      onRecordingChange(isRecording) {
        if (
          mountedRef.current &&
          operationRef.current === operation &&
          isRecording
        ) {
          changePhase("recording");
        }
      },
    });
    recorderRef.current = recorder;

    try {
      const audio = await recorder.start();
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      recorderRef.current = null;
      changePhase("transcribing");
      const transcript = await voiceApi.transcribe(audio, language);
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      if (!transcript) {
        setStatus(languageConfig.actions.emptyTranscript);
        changePhase("ready");
        return;
      }

      setValue(transcript);
      setAnswerSource("voice");
      setStatus("");

      const validationError = validateFarmerAnswer(field, transcript);
      if (validationError) {
        setValidationErrorCode(validationError);
        changePhase("ready");
        if (lastSpokenErrorRef.current !== validationError) {
          lastSpokenErrorRef.current = validationError;
          await speakValidationError(validationError);
        }
        return;
      }

      changePhase("ready");
      await runAnswerConfirmation(transcript, operation);
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      recorderRef.current = null;
      if (error.name === "AbortError") {
        if (["requesting", "recording", "transcribing"].includes(phaseRef.current)) {
          changePhase("ready");
        }
        return;
      }

      const actions = FARMER_REGISTRATION_LANGUAGES[language].actions;
      setStatus(
        error.name === "NotAllowedError" || error.name === "SecurityError"
          ? actions.micDenied
          : actions.micFallback,
      );
      changePhase("ready");
    } finally {
      if (operationRef.current === operation) {
        recorderRef.current = null;
      }
    }
  }

  async function runAnswerConfirmation(answerToConfirm, operation) {
    if (!mountedRef.current || operationRef.current !== operation || !languageConfig) {
      return;
    }

    setConfirmState("reading");
    const spokenAnswer =
      field === "phone" ? phoneReadback(answerToConfirm, language) : answerToConfirm;

    // Read the recognized answer back to the farmer, then ask if it is correct
    const confirmPrompt = `${languageConfig.confirmPrefix}: ${spokenAnswer}. ${languageConfig.confirmation.isCorrectPrompt}`;

    try {
      await playSpeech(confirmPrompt);
    } catch {
      // Abort or cancelled
    }

    if (!mountedRef.current || operationRef.current !== operation) {
      return;
    }

    // Now start listening for Yes / No confirmation
    await listenForConfirmationResponse(operation);
  }

  async function listenForConfirmationResponse(operation) {
    if (!mountedRef.current || operationRef.current !== operation || !languageConfig) {
      return;
    }

    setConfirmState("listening");

    // Only start voice recording for confirmation if voice guide is enabled
    if (!voiceGuideRef.current) {
      return;
    }

    const confirmRecorder = createVoiceRecorder({
      maxDurationMs: 10000,
      onRecordingChange(isRecording) {
        if (mountedRef.current && operationRef.current === operation && isRecording) {
          setConfirmState("listening");
        }
      },
    });
    recorderRef.current = confirmRecorder;

    try {
      const audio = await confirmRecorder.start();
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      recorderRef.current = null;
      setConfirmState("processing");

      const transcript = await voiceApi.transcribe(audio, language);
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      const decision = parseConfirmationResponse(transcript, language);

      if (decision === "yes") {
        await handleConfirmYes(operation);
      } else if (decision === "no") {
        await handleConfirmNo(operation);
      } else {
        // Unclear response: speak clarification notice and remain in listening state
        if (mountedRef.current && operationRef.current === operation) {
          setConfirmState("listening");
          await playSpeech(languageConfig.confirmation.unclearNotice);
        }
      }
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }
      recorderRef.current = null;
      if (error.name !== "AbortError") {
        setConfirmState("listening");
      }
    } finally {
      if (operationRef.current === operation) {
        recorderRef.current = null;
      }
    }
  }

  async function handleConfirmYes(passedOperation) {
    if (!language || advanceLockRef.current || isSubmitting) {
      return;
    }

    advanceLockRef.current = true;
    const operation = passedOperation ?? (operationRef.current + 1);
    if (!passedOperation) {
      operationRef.current = operation;
    }

    recorderRef.current?.cancel();
    recorderRef.current = null;
    voiceApi.stop(audioRef.current);

    const validationError = validateFarmerAnswer(field, value);
    if (validationError) {
      setValidationErrorCode(validationError);
      setConfirmState("idle");
      advanceLockRef.current = false;
      await speakValidationError(validationError);
      return;
    }

    setConfirmState("confirmed");
    setStatus(languageConfig.confirmation.confirmedNotice);

    const normalized = normalize(field, value);
    const completedAnswers = { ...answers, [field]: normalized };
    setAnswers(completedAnswers);
    setValidationErrorCode(null);
    setAnswerSource(null);
    setValue("");

    if (stepIndex === FARMER_REGISTRATION_FIELDS.length - 1) {
      changePhase("documents");
      setConfirmState("idle");
      void speakDocumentGuide(true);
      advanceLockRef.current = false;
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    changePhase("speaking");
    setConfirmState("idle");
    setStatus("");

    try {
      await playSpeech(
        languageConfig.steps[FARMER_REGISTRATION_FIELDS[nextIndex]].prompt,
      );
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        changePhase("ready");
      }
      advanceLockRef.current = false;
    }
  }

  async function handleConfirmNo(passedOperation) {
    if (!language || isSubmitting) {
      return;
    }

    const operation = passedOperation ?? (operationRef.current + 1);
    if (!passedOperation) {
      operationRef.current = operation;
    }

    recorderRef.current?.cancel();
    recorderRef.current = null;
    voiceApi.stop(audioRef.current);

    setValue("");
    setAnswerSource(null);
    setValidationErrorCode(null);
    setConfirmState("rejected");
    setStatus(languageConfig.confirmation.retryNotice);

    changePhase("speaking");
    try {
      const retryMessage = `${languageConfig.confirmation.retryNotice} ${step.prompt}`;
      await playSpeech(retryMessage);
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        setConfirmState("idle");
        changePhase("ready");
        setStatus("");
        if (voiceGuideRef.current) {
          void startRecording();
        }
      }
    }
  }

  async function handleReplayConfirmation() {
    if (!value || !languageConfig) return;
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    recorderRef.current?.cancel();
    recorderRef.current = null;
    voiceApi.stop(audioRef.current);

    await runAnswerConfirmation(value, operation);
  }

  function handleMicrophone() {
    if (phaseRef.current === "recording" || confirmState === "listening") {
      recorderRef.current?.stop();
      return;
    }
    void startRecording();
  }

  function handleValueChange(event) {
    setValue(event.target.value);
    setAnswerSource("typed");
    setValidationErrorCode(null);
    lastSpokenErrorRef.current = null;
    setStatus("");
    setConfirmState("idle");
  }

  async function speakValidationError(code) {
    if (!language) {
      return;
    }
    const message = getFarmerValidationMessage(code, language, {
      digits: phoneDigitCount(value),
      min: field === "name" ? 2 : 1,
    });
    if (message) {
      await playSpeech(message.spoken);
    }
  }

  function showServerFieldError(answerField, code) {
    const index = FARMER_REGISTRATION_FIELDS.indexOf(answerField);
    if (index === -1 || !language) {
      return false;
    }

    setStepIndex(index);
    setValue(answers[answerField] ?? "");
    setAnswerSource("typed");
    setValidationErrorCode(code);
    setStatus("");
    setConfirmState("idle");
    changePhase("ready");
    lastSpokenErrorRef.current = code;
    void speakValidationError(code);
    return true;
  }

  async function proceedToNextStep() {
    await handleConfirmYes();
  }

  async function speakDocumentGuide(automatic = false) {
    if (!language || phaseRef.current !== "documents") {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setDocumentVoicePhase("speaking");
    setDocumentVoiceStatus("");
    try {
      await playSpeech(
        FARMER_REGISTRATION_LANGUAGES[language].documentGuide,
        { automatic },
      );
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setDocumentVoiceStatus(languageConfig.actions.voiceFallback);
      }
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        setDocumentVoicePhase("idle");
      }
    }
  }

  async function listenForDocumentHelp() {
    if (phaseRef.current !== "documents" || isSubmitting) {
      return;
    }

    if (documentVoicePhase === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (documentVoicePhase !== "idle") {
      return;
    }

    voiceApi.stop(audioRef.current);
    setDocumentVoiceStatus("");
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setDocumentVoicePhase("requesting");

    const recorder = createVoiceRecorder({
      maxDurationMs: 25000,
      onRecordingChange(isRecording) {
        if (
          mountedRef.current &&
          operationRef.current === operation &&
          isRecording
        ) {
          setDocumentVoicePhase("recording");
        }
      },
    });
    recorderRef.current = recorder;

    try {
      const audio = await recorder.start();
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      recorderRef.current = null;
      setDocumentVoicePhase("transcribing");
      const transcript = await voiceApi.transcribe(audio, language);
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }
      if (!transcript) {
        setDocumentVoiceStatus(languageConfig.retry);
        setDocumentVoicePhase("idle");
        return;
      }

      setDocumentVoiceStatus(
        `${languageConfig.documentHeardPrefix}: ${transcript}`,
      );
      setDocumentVoicePhase("speaking");
      try {
        await playSpeech(languageConfig.documentGuide);
      } catch {
        if (mountedRef.current && operationRef.current === operation) {
          setDocumentVoiceStatus(languageConfig.actions.voiceFallback);
        }
      }
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }
      recorderRef.current = null;
      if (error.name === "AbortError") {
        setDocumentVoicePhase("idle");
        return;
      }
      setDocumentVoiceStatus(
        error.name === "NotAllowedError" || error.name === "SecurityError"
          ? languageConfig.actions.micDenied
          : languageConfig.actions.micFallback,
      );
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        setDocumentVoicePhase("idle");
      }
    }
  }

  function updateDocumentFiles(event) {
    const { name, files } = event.target;
    const selectedFiles = Array.from(files);
    if (
      selectedFiles.some(
        (file) =>
          file.size > 8 * 1024 * 1024 ||
          !["application/pdf", "image/jpeg", "image/png"].includes(file.type),
      )
    ) {
      setStatus("Use PDF, JPG, JPEG, or PNG files no larger than 8 MB each.");
      event.target.value = "";
      return;
    }
    if (name === "supportingDocuments" && selectedFiles.length > 5) {
      setStatus("Choose no more than 5 additional supporting documents.");
      event.target.value = "";
      return;
    }
    setDocumentFiles((current) => ({
      ...current,
      [name]: name === "supportingDocuments" ? selectedFiles : selectedFiles[0] ?? null,
    }));
    setStatus("");
  }

  async function submitRegistration(event) {
    event.preventDefault();
    setStatus("");
    if (!documentFiles.aadhaarDocument || !documentFiles.landDocument) {
      setStatus("Upload both the Aadhaar card and land ownership certificate.");
      return;
    }
    if (!password || password.length < 8 || password.length > 72) {
      setStatus("Create a password between 8 and 72 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    const registration = new FormData();
    registration.append("fullName", answers.name);
    registration.append("mobileNumber", answers.phone);
    registration.append("village", answers.village);
    registration.append("district", answers.district);
    registration.append("state", answers.state);
    registration.append("landSizeAcres", String(Number(answers.acres)));
    registration.append("cropType", answers.crop);
    registration.append("preferredLanguage", language);
    registration.append("password", password);
    registration.append("farmerRegistrationKey", registrationKey);
    if (answers.email) {
      registration.append("email", answers.email);
    }
    registration.append("aadhaarDocument", documentFiles.aadhaarDocument);
    registration.append("landDocument", documentFiles.landDocument);
    for (const file of documentFiles.supportingDocuments) {
      registration.append("supportingDocuments", file);
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/farmers/register`, {
        method: "POST",
        headers: { "Idempotency-Key": registrationKey },
        body: registration,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          showServerFieldError("phone", "duplicate");
        } else if (response.status === 400) {
          const fieldErrors = result.fieldErrors ?? result.errors;
          const serverField =
            result.field ??
            (fieldErrors && typeof fieldErrors === "object"
              ? Object.keys(fieldErrors)[0]
              : null);
          const fieldMap = {
            fullName: "name",
            name: "name",
            mobileNumber: "phone",
            phone: "phone",
            village: "village",
            district: "district",
            state: "state",
            landSizeAcres: "acres",
            acres: "acres",
            cropType: "crop",
            crop: "crop",
          };
          const answerField = fieldMap[serverField];
          if (!answerField || !showServerFieldError(answerField, "server_invalid")) {
            setStatus(result.message || languageConfig.invalidDetails);
          }
        } else {
          setStatus(result.message || languageConfig.saveFailed);
        }
        return;
      }

      changePhase("done");
      setStatus(
        result.message ||
          "Your registration and documents were submitted and are awaiting verification.",
      );
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setStatus(languageConfig.saveFailed);
      }
      return;
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        setIsSubmitting(false);
      }
    }

    if (mountedRef.current && operationRef.current === operation) {
      await playSpeech(languageConfig.done);
    }
  }

  const actions = languageConfig?.actions;
  const microphoneLabel =
    phase === "recording"
      ? actions?.stopRecording || "Stop recording"
      : phase === "requesting"
        ? actions?.startingMic || "Starting microphone"
        : actions?.speakAnswer || "Speak your answer";
  const isDocumentVoiceBusy = documentVoicePhase !== "idle";
  const validationMessage = validationErrorCode
    ? getFarmerValidationMessage(validationErrorCode, language, {
        digits: phoneDigitCount(value),
        min: field === "name" ? 2 : 1,
      })
    : null;
  const phoneDigits = field === "phone" ? phoneDigitCount(value) : 0;
  const FieldIcon = FIELD_ICONS[field] ?? Sprout;
  const voiceToggle = (
    <button
      aria-label={voiceGuideEnabled ? "Voice On" : "Voice Off"}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 font-bold text-text hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={toggleVoiceGuide}
      type="button"
    >
      {voiceGuideEnabled ? (
        <Volume2 aria-hidden="true" size={22} className="text-primary" />
      ) : (
        <VolumeX aria-hidden="true" size={22} className="text-text-muted" />
      )}
      <span>
        {voiceGuideEnabled
          ? actions?.voiceOn || "Voice On"
          : actions?.voiceOff || "Voice Off"}
      </span>
    </button>
  );

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <audio ref={audioRef} className="sr-only" />

      <div className="mb-6 flex items-center justify-between gap-4">
        <RouteLink
          className="inline-flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-base font-semibold text-primary underline underline-offset-4 hover:opacity-85"
          to="/"
          onNavigate={onNavigate}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{actions?.back || "Back"}</span>
        </RouteLink>
        <span className="rounded-full bg-primary-soft text-primary-soft-text px-4 py-1.5 text-sm font-bold border border-primary/20">
          {actions?.title || "Farmer registration"}
        </span>
      </div>

      {phase === "language" ? (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs sm:p-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-3 text-3xl font-extrabold leading-tight text-text sm:text-4xl font-serif">
              <Languages aria-hidden="true" size={32} className="text-primary" />
              Choose your language
            </h1>
            {voiceToggle}
          </div>
          <p className="mb-8 text-lg text-text-muted">
            भाषा निवडा · भाषा चुनें
          </p>
          <div className="grid gap-4">
            {Object.entries(FARMER_REGISTRATION_LANGUAGES).map(
              ([code, config]) => (
                <button
                  className="min-h-16 rounded-2xl border-2 border-border bg-surface-muted px-6 py-4 text-left text-2xl font-bold text-text transition hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  key={code}
                  onClick={() => void chooseLanguage(code)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <Sprout aria-hidden="true" size={26} className="text-primary" />
                    {config.name}
                  </span>
                </button>
              ),
            )}
          </div>
          <p className="mt-6 text-base text-text-muted">
            Allow microphone access when asked. / पूछे जाने पर माइक्रोफ़ोन की अनुमति दें।
          </p>
        </div>
      ) : phase === "done" ? (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs sm:p-10">
          <p className="mb-3 text-lg font-bold text-primary">
            {languageConfig.done}
          </p>
          {status && (
            <p className="mb-4 rounded-xl border border-warning/30 bg-warning-soft p-4 text-base font-semibold text-warning-soft-text" role="status">
              {status}
            </p>
          )}
          <h1 className="mb-6 text-3xl font-extrabold text-text font-serif">
            {languageConfig.actions.completeTitle}
          </h1>
          <dl className="space-y-4">
            {FARMER_REGISTRATION_FIELDS.map((answerField) => (
              <div
                className="grid gap-1 border-b border-border pb-3 sm:grid-cols-[12rem_1fr]"
                key={answerField}
              >
                <dt className="font-bold text-text">
                  {languageConfig.steps[answerField].label}
                </dt>
                <dd className="break-words text-text-muted">
                  {answers[answerField]}
                </dd>
              </div>
            ))}
          </dl>
          <button
            className="mt-6 min-h-14 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-3 text-lg font-extrabold transition-colors cursor-pointer shadow-xs"
            onClick={() => onNavigate("/login")}
            type="button"
          >
            {languageConfig.actions.login}
          </button>
        </div>
      ) : phase === "documents" ? (
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-10">
          <h1 className="mb-3 text-3xl font-extrabold text-text font-serif">
            Upload required documents
          </h1>
          <p className="mb-5 text-lg text-text-muted">{languageConfig.documentGuide}</p>
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              className="min-h-12 rounded-xl border border-border bg-surface-muted px-4 py-2 font-bold text-text hover:bg-border/60 disabled:opacity-50 cursor-pointer transition-colors"
              disabled={isDocumentVoiceBusy || isSubmitting}
              onClick={() => void speakDocumentGuide()}
              type="button"
            >
              {languageConfig.actions.replay}
            </button>
            <button
              className={`min-h-12 rounded-xl border-2 px-4 py-2 font-bold disabled:opacity-50 cursor-pointer transition-colors ${
                documentVoicePhase === "recording"
                  ? "border-danger bg-danger text-danger-foreground animate-pulse"
                  : "border-primary bg-primary-soft text-primary-soft-text hover:bg-primary hover:text-primary-foreground"
              }`}
              disabled={
                isSubmitting ||
                ["requesting", "transcribing", "speaking"].includes(documentVoicePhase)
              }
              onClick={() => void listenForDocumentHelp()}
              type="button"
            >
              {documentVoicePhase === "recording"
                ? languageConfig.documentStop
                : documentVoicePhase === "requesting"
                  ? languageConfig.actions.requesting
                  : documentVoicePhase === "transcribing"
                    ? languageConfig.documentListening
                    : languageConfig.documentListen}
            </button>
          </div>
          {documentVoiceStatus && (
            <p
              className="mb-5 rounded-xl border border-warning/30 bg-warning-soft p-4 font-semibold text-warning-soft-text"
              role="status"
            >
              {documentVoiceStatus}
            </p>
          )}
          <p className="mb-6 text-sm text-text-muted">
            PDF, JPG, JPEG, or PNG only. Maximum 8 MB per file. Documents are
            stored privately and reviewed by an authorized verifier.
          </p>
          <form className="grid gap-5" onSubmit={submitRegistration}>
            <label className="grid gap-2 font-bold text-text text-left" htmlFor="aadhaar-document">
              Aadhaar card (required)
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="min-h-12 rounded-xl border border-border bg-surface text-text p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                id="aadhaar-document"
                name="aadhaarDocument"
                onChange={updateDocumentFiles}
                required
                type="file"
              />
              <span className="text-sm font-normal text-text-muted">
                {documentFiles.aadhaarDocument
                  ? `Selected: ${documentFiles.aadhaarDocument.name}`
                  : "No file selected"}
              </span>
            </label>

            <label className="grid gap-2 font-bold text-text text-left" htmlFor="land-document">
              Land ownership / property certificate (required)
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="min-h-12 rounded-xl border border-border bg-surface text-text p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                id="land-document"
                name="landDocument"
                onChange={updateDocumentFiles}
                required
                type="file"
              />
              <span className="text-sm font-normal text-text-muted">
                {documentFiles.landDocument
                  ? `Selected: ${documentFiles.landDocument.name}`
                  : "No file selected"}
              </span>
            </label>

            <label className="grid gap-2 font-bold text-text text-left" htmlFor="supporting-documents">
              Additional Supporting Documents (Optional)
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="min-h-12 rounded-xl border border-border bg-surface text-text p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                id="supporting-documents"
                multiple
                name="supportingDocuments"
                onChange={updateDocumentFiles}
                type="file"
              />
              <span className="text-sm font-normal text-text-muted">
                {documentFiles.supportingDocuments.length
                  ? `${documentFiles.supportingDocuments.length} file(s) selected`
                  : "Up to 5 files"}
              </span>
            </label>

            <label className="grid gap-2 font-bold text-text text-left" htmlFor="farmer-password">
              Create password
              <input
                autoComplete="new-password"
                className="min-h-12 rounded-xl border border-border bg-surface text-text p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                id="farmer-password"
                maxLength={72}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className="grid gap-2 font-bold text-text text-left" htmlFor="farmer-confirm-password">
              Confirm password
              <input
                autoComplete="new-password"
                className="min-h-12 rounded-xl border border-border bg-surface text-text p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                id="farmer-confirm-password"
                maxLength={72}
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            {status && (
              <p className="rounded-xl border border-warning/30 bg-warning-soft p-4 font-semibold text-warning-soft-text" role="status">
                {status}
              </p>
            )}
            <button
              className="min-h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-3 text-lg font-extrabold transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Submitting registration..." : "Submit for verification"}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-10">
          <div className="mb-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <p className="text-lg font-extrabold text-primary">
                {stepIndex + 1} / {FARMER_REGISTRATION_FIELDS.length}
              </p>
              {voiceToggle}
            </div>
            <div
              aria-label={`Question ${stepIndex + 1} of ${FARMER_REGISTRATION_FIELDS.length}`}
              className="h-3 overflow-hidden rounded-full bg-surface-muted border border-border/40"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={FARMER_REGISTRATION_FIELDS.length}
              aria-valuenow={stepIndex + 1}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${((stepIndex + 1) / FARMER_REGISTRATION_FIELDS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="flex-1 text-2xl font-extrabold leading-snug text-text sm:text-3xl font-serif">
              {step.prompt}
            </p>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-2 font-bold text-text hover:bg-border/60 transition-colors cursor-pointer"
              onClick={() => listenTo(step.prompt)}
              type="button"
            >
              <Volume2 aria-hidden="true" size={22} className="text-primary" />
              <span>{actions.listen}</span>
            </button>
          </div>

          <button
            className={`mb-6 min-h-18 w-full rounded-2xl border-2 px-5 py-4 text-xl font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all cursor-pointer shadow-md ${
              phase === "recording"
                ? "border-danger bg-danger text-danger-foreground animate-pulse"
                : "border-primary bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.99]"
            }`}
            aria-label={microphoneLabel}
            disabled={isSubmitting || ["requesting", "transcribing"].includes(phase)}
            onClick={handleMicrophone}
            type="button"
          >
            {phase === "recording" ? (
              <Square aria-hidden="true" className="mr-2 inline" size={24} />
            ) : phase === "requesting" || phase === "transcribing" ? (
              <Loader2
                aria-hidden="true"
                className="mr-2 inline animate-spin"
                size={24}
              />
            ) : (
              <Mic aria-hidden="true" className="mr-2 inline" size={24} />
            )}
            <span>{microphoneLabel}</span>
          </button>

          <label
            className="mb-2 flex items-center gap-2 text-lg font-bold text-text"
            htmlFor="farmer-answer"
          >
            <FieldIcon aria-hidden="true" size={22} className="text-primary" />
            <span>{step.label}</span>
          </label>
          <input
            autoComplete={field === "phone" ? "tel" : "off"}
            aria-describedby={[
              validationMessage ? "farmer-answer-error" : null,
              field === "phone" ? "farmer-phone-counter" : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined}
            aria-invalid={Boolean(validationMessage)}
            className={`min-h-14 w-full rounded-xl border-2 bg-surface px-4 py-3 text-xl text-text placeholder:text-text-muted/60 transition-colors focus-visible:outline-none ${
              validationMessage
                ? "border-danger focus-visible:border-danger focus-visible:ring-2 focus-visible:ring-danger"
                : "border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            }`}
            id="farmer-answer"
            disabled={isSubmitting}
            inputMode={
              field === "phone"
                ? "tel"
                : field === "acres"
                  ? "decimal"
                  : "text"
            }
            onChange={handleValueChange}
            placeholder={languageConfig.actions.placeholder}
            value={value}
          />

          {field === "phone" && (
            <p
              className={`mt-2 text-sm font-semibold ${
                phoneDigits > 10 ? "text-danger" : "text-text-muted"
              }`}
              id="farmer-phone-counter"
            >
              {phoneDigits}/10 {language === "en-IN" ? "digits" : "अंक"}
            </p>
          )}

          {/* Voice Answer Confirmation Card */}
          {(confirmState !== "idle" || (value && !validationMessage)) && (
            <div
              className="mt-6 rounded-3xl border-2 border-primary/30 bg-primary-soft/20 p-5 sm:p-7 shadow-sm transition-all"
              data-testid="voice-confirmation"
            >
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                  {confirmState === "reading" ? (
                    <span className="flex items-center gap-2 text-primary font-extrabold animate-pulse">
                      <Volume2 size={20} />
                      <span>{actions.checkHeard}...</span>
                    </span>
                  ) : confirmState === "listening" ? (
                    <span className="flex items-center gap-2 text-danger font-extrabold animate-pulse">
                      <Mic size={20} className="text-danger animate-bounce" />
                      <span>{languageConfig.confirmation.listeningYesNo}</span>
                    </span>
                  ) : confirmState === "processing" ? (
                    <span className="flex items-center gap-2 text-primary font-bold">
                      <Loader2 size={20} className="animate-spin text-primary" />
                      <span>Processing confirmation...</span>
                    </span>
                  ) : confirmState === "confirmed" ? (
                    <span className="flex items-center gap-2 text-emerald-600 font-extrabold">
                      <CheckCircle size={20} />
                      <span>{languageConfig.confirmation.confirmedNotice}</span>
                    </span>
                  ) : confirmState === "rejected" ? (
                    <span className="flex items-center gap-2 text-danger font-bold">
                      <XCircle size={20} />
                      <span>{languageConfig.confirmation.retryNotice}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-text font-bold">
                      <Check size={20} className="text-primary" />
                      <span>{actions.checkHeard}:</span>
                    </span>
                  )}
                </div>

                {/* Hear Again button */}
                <button
                  type="button"
                  onClick={handleReplayConfirmation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-text hover:text-primary hover:border-primary transition-colors cursor-pointer"
                  title={languageConfig.confirmation.hearAgain}
                >
                  <RotateCcw size={16} />
                  <span>{languageConfig.confirmation.hearAgain}</span>
                </button>
              </div>

              {/* Spoken Answer Display & Confirmation Question */}
              <div className="mb-5 text-center sm:text-left">
                <p className="text-xs uppercase tracking-wider font-extrabold text-text-muted mb-1">
                  {step.label}
                </p>
                <div className="text-2xl sm:text-3xl font-extrabold text-text break-words font-serif">
                  {value}
                </div>
                <p className="mt-2 text-base sm:text-lg font-bold text-primary">
                  {languageConfig.confirmation.confirmQuestionText}
                </p>
              </div>

              {/* Two Large YES / NO Touch-Friendly Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* YES Button */}
                <button
                  type="button"
                  onClick={() => void handleConfirmYes()}
                  disabled={isSubmitting || confirmState === "confirmed"}
                  className="group min-h-16 p-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.99] cursor-pointer border-2 border-primary"
                >
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <CheckCircle size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-lg sm:text-xl leading-tight">
                      {languageConfig.confirmation.yesLabel}
                    </div>
                    <div className="text-xs font-semibold text-primary-foreground/80">
                      होय म्हणा किंवा टॅप करा (Say Yes)
                    </div>
                  </div>
                </button>

                {/* NO Button */}
                <button
                  type="button"
                  onClick={() => void handleConfirmNo()}
                  disabled={isSubmitting || confirmState === "rejected"}
                  className="group min-h-16 p-4 rounded-2xl bg-surface hover:bg-surface-muted text-text hover:text-danger border-2 border-border hover:border-danger/60 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-[0.99] cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center text-text-muted group-hover:text-danger group-hover:scale-110 transition-all">
                    <XCircle size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-lg sm:text-xl leading-tight text-text group-hover:text-danger transition-colors">
                      {languageConfig.confirmation.noLabel}
                    </div>
                    <div className="text-xs font-semibold text-text-muted">
                      नाही म्हणा किंवा टॅप करा (Say No)
                    </div>
                  </div>
                </button>
              </div>

              {/* Live Mic Listening indicator banner during voice confirmation */}
              {confirmState === "listening" && (
                <div className="mt-4 p-3 rounded-xl bg-danger-soft/40 border border-danger/30 text-center text-xs sm:text-sm font-bold text-danger flex items-center justify-center gap-2 animate-pulse">
                  <Mic size={18} className="animate-bounce text-danger" />
                  <span>{languageConfig.confirmation.listeningYesNo}</span>
                </div>
              )}
            </div>
          )}

          {validationMessage && (
            <div
              aria-live="polite"
              className="mt-3 flex flex-wrap items-center gap-2 text-base font-semibold text-danger p-3.5 rounded-xl bg-danger-soft border border-danger/30"
              id="farmer-answer-error"
              role="alert"
              data-validation-code={validationErrorCode}
            >
              <AlertCircle aria-hidden="true" size={20} className="shrink-0" />
              <span className="flex-1">{validationMessage.visual}</span>
              <button
                aria-label={actions.listen}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-danger/40 bg-surface/50 px-3 py-2 text-danger hover:bg-surface cursor-pointer"
                onClick={() => listenTo(validationMessage.spoken)}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
                <span>{actions.listen}</span>
              </button>
            </div>
          )}

          {status && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-base font-semibold text-warning-soft-text">
              <AlertCircle aria-hidden="true" size={20} className="shrink-0" />
              <p className="flex-1" role="status">{status}</p>
              <button
                aria-label={actions.listen}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-warning/40 bg-surface/50 px-3 py-2 text-warning-soft-text hover:bg-surface cursor-pointer"
                onClick={() => listenTo(status)}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
                <span>{actions.listen}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default RegisterFarmer;
