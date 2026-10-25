import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Map,
  MapPin,
  Mic,
  Phone,
  Ruler,
  Sprout,
  Square,
  User,
  Volume2,
  VolumeX,
  Wheat,
  Languages,
} from "lucide-react";
import RouteLink from "../../components/RouteLink.jsx";
import {
  FARMER_REGISTRATION_FIELDS,
  FARMER_REGISTRATION_LANGUAGES,
  getFarmerValidationMessage,
  normalize,
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
      changePhase("ready");
      const spokenAnswer =
        field === "phone" ? phoneReadback(transcript, language) : transcript;
      await playSpeech(`${languageConfig.confirmPrefix}: ${spokenAnswer}`);
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

  function handleMicrophone() {
    if (phaseRef.current === "recording") {
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
    changePhase("ready");
    lastSpokenErrorRef.current = code;
    void speakValidationError(code);
    return true;
  }

  async function proceedToNextStep() {
    if (!language || advanceLockRef.current || isSubmitting) {
      return;
    }

    advanceLockRef.current = true;
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    voiceApi.stop(audioRef.current);
    setStatus("");

    const validationError = validateFarmerAnswer(field, value);
    if (validationError) {
      setValidationErrorCode(validationError);
      if (lastSpokenErrorRef.current !== validationError) {
        lastSpokenErrorRef.current = validationError;
        await speakValidationError(validationError);
      }
      advanceLockRef.current = false;
      return;
    }

    const normalized = normalize(field, value);
    const completedAnswers = { ...answers, [field]: normalized };
    setAnswers(completedAnswers);
    setValidationErrorCode(null);
    setAnswerSource(null);
    setValue("");

    if (stepIndex === FARMER_REGISTRATION_FIELDS.length - 1) {
      changePhase("documents");
      void speakDocumentGuide(true);
      advanceLockRef.current = false;
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    changePhase("speaking");
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
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-900 px-4 py-2 font-bold text-emerald-950 hover:bg-emerald-50"
      onClick={toggleVoiceGuide}
      type="button"
    >
      {voiceGuideEnabled ? (
        <Volume2 aria-hidden="true" size={22} />
      ) : (
        <VolumeX aria-hidden="true" size={22} />
      )}
      {voiceGuideEnabled
        ? actions?.voiceOn || "Voice On"
        : actions?.voiceOff || "Voice Off"}
    </button>
  );

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <audio ref={audioRef} className="sr-only" />

      <div className="mb-6 flex items-center justify-between gap-4">
        <RouteLink
          className="inline-flex min-h-12 items-center rounded-lg px-3 text-base font-semibold text-emerald-950 underline underline-offset-4"
          to="/"
          onNavigate={onNavigate}
        >
          {actions?.back || "Back"}
        </RouteLink>
        <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-950">
          {actions?.title || "Farmer registration"}
        </span>
      </div>

      {phase === "language" ? (
        <div className="rounded-3xl border-2 border-emerald-900 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-3 text-3xl font-extrabold leading-tight text-emerald-950 sm:text-4xl">
              <Languages aria-hidden="true" size={32} />
              Choose your language
            </h1>
            {voiceToggle}
          </div>
          <p className="mb-8 text-lg text-slate-800">
            भाषा निवडा · भाषा चुनें
          </p>
          <div className="grid gap-4">
            {Object.entries(FARMER_REGISTRATION_LANGUAGES).map(
              ([code, config]) => (
                <button
                  className="min-h-16 rounded-2xl border-2 border-emerald-900 bg-emerald-50 px-6 py-4 text-left text-2xl font-bold text-emerald-950 transition hover:bg-emerald-100 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  key={code}
                  onClick={() => void chooseLanguage(code)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <Sprout aria-hidden="true" size={26} />
                    {config.name}
                  </span>
                </button>
              ),
            )}
          </div>
          <p className="mt-6 text-base text-slate-800">
            Allow microphone access when asked. / पूछे जाने पर माइक्रोफ़ोन की अनुमति दें।
          </p>
        </div>
      ) : phase === "done" ? (
        <div className="rounded-3xl border-2 border-emerald-900 bg-white p-6 shadow-sm sm:p-10">
          <p className="mb-3 text-lg font-bold text-emerald-800">
            {languageConfig.done}
          </p>
          {status && (
            <p className="mb-4 rounded-xl bg-amber-50 p-4 text-base font-semibold text-slate-950" role="status">
              {status}
            </p>
          )}
          <h1 className="mb-6 text-3xl font-extrabold text-emerald-950">
            {languageConfig.actions.completeTitle}
          </h1>
          <dl className="space-y-4">
            {FARMER_REGISTRATION_FIELDS.map((answerField) => (
              <div
                className="grid gap-1 border-b border-slate-300 pb-3 sm:grid-cols-[12rem_1fr]"
                key={answerField}
              >
                <dt className="font-bold text-slate-900">
                  {languageConfig.steps[answerField].label}
                </dt>
                <dd className="break-words text-slate-800">
                  {answers[answerField]}
                </dd>
              </div>
            ))}
          </dl>
          <button
            className="mt-6 min-h-14 rounded-xl border-2 border-emerald-950 bg-emerald-800 px-5 py-3 text-lg font-extrabold text-white hover:bg-emerald-900"
            onClick={() => onNavigate("/login")}
            type="button"
          >
            {languageConfig.actions.login}
          </button>
        </div>
      ) : phase === "documents" ? (
        <div className="rounded-3xl border-2 border-emerald-900 bg-white p-5 shadow-sm sm:p-10">
          <h1 className="mb-3 text-3xl font-extrabold text-emerald-950">
            Upload required documents
          </h1>
          <p className="mb-5 text-lg text-slate-900">{languageConfig.documentGuide}</p>
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              className="min-h-12 rounded-xl border-2 border-emerald-900 px-4 py-2 font-bold text-emerald-950 hover:bg-emerald-50 disabled:opacity-50"
              disabled={isDocumentVoiceBusy || isSubmitting}
              onClick={() => void speakDocumentGuide()}
              type="button"
            >
              {languageConfig.actions.replay}
            </button>
            <button
              className={`min-h-12 rounded-xl border-2 px-4 py-2 font-bold disabled:opacity-50 ${
                documentVoicePhase === "recording"
                  ? "border-red-900 bg-red-800 text-white"
                  : "border-emerald-900 text-emerald-950 hover:bg-emerald-50"
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
              className="mb-5 rounded-xl border-2 border-amber-700 bg-amber-50 p-4 font-semibold text-slate-950"
              role="status"
            >
              {documentVoiceStatus}
            </p>
          )}
          <p className="mb-6 text-base text-slate-800">
            PDF, JPG, JPEG, or PNG only. Maximum 8 MB per file. Documents are
            stored privately and reviewed by an authorized verifier.
          </p>
          <form className="grid gap-5" onSubmit={submitRegistration}>
            <label className="grid gap-2 font-bold text-slate-950" htmlFor="aadhaar-document">
              Aadhaar card (required)
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="min-h-12 rounded-xl border-2 border-slate-600 p-3"
                id="aadhaar-document"
                name="aadhaarDocument"
                onChange={updateDocumentFiles}
                required
                type="file"
              />
              <span className="text-sm font-normal text-slate-700">
                {documentFiles.aadhaarDocument
                  ? `Selected: ${documentFiles.aadhaarDocument.name}`
                  : "No file selected"}
              </span>
            </label>

            <label className="grid gap-2 font-bold text-slate-950" htmlFor="land-document">
              Land ownership / property certificate (required)
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="min-h-12 rounded-xl border-2 border-slate-600 p-3"
                id="land-document"
                name="landDocument"
                onChange={updateDocumentFiles}
                required
                type="file"
              />
              <span className="text-sm font-normal text-slate-700">
                {documentFiles.landDocument
                  ? `Selected: ${documentFiles.landDocument.name}`
                  : "No file selected"}
              </span>
            </label>

            <label className="grid gap-2 font-bold text-slate-950" htmlFor="supporting-documents">
              Additional Supporting Documents (Optional)
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="min-h-12 rounded-xl border-2 border-slate-600 p-3"
                id="supporting-documents"
                multiple
                name="supportingDocuments"
                onChange={updateDocumentFiles}
                type="file"
              />
              <span className="text-sm font-normal text-slate-700">
                {documentFiles.supportingDocuments.length
                  ? `${documentFiles.supportingDocuments.length} file(s) selected`
                  : "Up to 5 files"}
              </span>
            </label>

            <label className="grid gap-2 font-bold text-slate-950" htmlFor="farmer-password">
              Create password
              <input
                autoComplete="new-password"
                className="min-h-12 rounded-xl border-2 border-slate-600 p-3"
                id="farmer-password"
                maxLength={72}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className="grid gap-2 font-bold text-slate-950" htmlFor="farmer-confirm-password">
              Confirm password
              <input
                autoComplete="new-password"
                className="min-h-12 rounded-xl border-2 border-slate-600 p-3"
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
              <p className="rounded-xl border-2 border-amber-700 bg-amber-50 p-4 font-semibold text-slate-950" role="status">
                {status}
              </p>
            )}
            <button
              className="min-h-14 rounded-xl border-2 border-emerald-950 bg-emerald-800 px-5 py-3 text-lg font-extrabold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Submitting registration..." : "Submit for verification"}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-emerald-900 bg-white p-5 shadow-sm sm:p-10">
          <div className="mb-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <p className="text-lg font-extrabold text-emerald-950">
                {stepIndex + 1} / {FARMER_REGISTRATION_FIELDS.length}
              </p>
              {voiceToggle}
            </div>
            <div
              aria-label={`Question ${stepIndex + 1} of ${FARMER_REGISTRATION_FIELDS.length}`}
              className="h-3 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={FARMER_REGISTRATION_FIELDS.length}
              aria-valuenow={stepIndex + 1}
            >
              <div
                className="h-full rounded-full bg-emerald-800 transition-all"
                style={{
                  width: `${((stepIndex + 1) / FARMER_REGISTRATION_FIELDS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="flex-1 text-2xl font-extrabold leading-snug text-slate-950 sm:text-3xl">
              {step.prompt}
            </p>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-900 px-4 py-2 font-bold text-emerald-950 hover:bg-emerald-50"
              onClick={() => listenTo(step.prompt)}
              type="button"
            >
              <Volume2 aria-hidden="true" size={22} />
              {actions.listen}
            </button>
          </div>

          <button
            className={`mb-6 min-h-16 w-full rounded-2xl border-2 px-5 py-4 text-xl font-extrabold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              phase === "recording"
                ? "border-red-900 bg-red-800 hover:bg-red-900"
                : "border-emerald-950 bg-emerald-800 hover:bg-emerald-900"
            }`}
            aria-label={microphoneLabel}
            disabled={isSubmitting || ["requesting", "transcribing"].includes(phase)}
            onClick={handleMicrophone}
            type="button"
          >
            {phase === "recording" ? (
              <Square aria-hidden="true" className="mr-2 inline" size={22} />
            ) : phase === "requesting" || phase === "transcribing" ? (
              <Loader2
                aria-hidden="true"
                className="mr-2 inline animate-spin"
                size={22}
              />
            ) : (
              <Mic aria-hidden="true" className="mr-2 inline" size={22} />
            )}
            {microphoneLabel}
          </button>

          <label
            className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-950"
            htmlFor="farmer-answer"
          >
            <FieldIcon aria-hidden="true" size={22} />
            {step.label}
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
            className={`min-h-14 w-full rounded-xl border-2 bg-white px-4 py-3 text-xl text-slate-950 placeholder:text-slate-500 focus:outline-4 focus:outline-emerald-200 ${
              validationMessage
                ? "border-red-700 focus:border-red-700"
                : "border-slate-700 focus:border-emerald-800"
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
                phoneDigits > 10 ? "text-red-700" : "text-slate-700"
              }`}
              id="farmer-phone-counter"
            >
              {phoneDigits}/10 {language === "en-IN" ? "digits" : "अंक"}
            </p>
          )}

          {answerSource === "voice" && value && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-sky-700 bg-sky-50 p-4">
              <p
                className="flex min-h-12 flex-1 items-center gap-2 font-semibold text-sky-950"
                data-testid="voice-confirmation"
              >
                <Check aria-hidden="true" size={22} />
                {actions.checkHeard}: <span className="break-all">{value}</span>
              </p>
              <button
                aria-label={actions.listen}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-sky-900 px-3 py-2 font-bold text-sky-950"
                onClick={() => {
                  const spoken =
                    field === "phone" ? phoneReadback(value, language) : value;
                  listenTo(`${languageConfig.confirmPrefix}: ${spoken}`);
                }}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
                {actions.listen}
              </button>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-sky-900 px-3 py-2 font-bold text-sky-950"
                onClick={handleMicrophone}
                type="button"
              >
                <Mic aria-hidden="true" size={20} />
                {actions.speakAgain}
              </button>
            </div>
          )}

          {validationMessage && (
            <div
              aria-live="polite"
              className="mt-3 flex flex-wrap items-center gap-2 text-base font-semibold text-red-800"
              id="farmer-answer-error"
              role="alert"
              data-validation-code={validationErrorCode}
            >
              <AlertCircle aria-hidden="true" size={20} />
              <span className="flex-1">{validationMessage.visual}</span>
              <button
                aria-label={actions.listen}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border-2 border-red-800 px-3 py-2 text-red-900"
                onClick={() => listenTo(validationMessage.spoken)}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
                {actions.listen}
              </button>
            </div>
          )}

          {status && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-700 bg-amber-50 p-4 text-base font-semibold text-slate-950">
              <AlertCircle aria-hidden="true" size={20} />
              <p className="flex-1" role="status">{status}</p>
              <button
                aria-label={actions.listen}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border-2 border-amber-900 px-3 py-2"
                onClick={() => listenTo(status)}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
                {actions.listen}
              </button>
            </div>
          )}

          <button
            className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-950 bg-emerald-100 px-5 py-3 text-lg font-extrabold text-emerald-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => void proceedToNextStep()}
            type="button"
          >
            <ArrowRight aria-hidden="true" size={24} />
            {actions.proceed}
          </button>
        </div>
      )}
    </section>
  );
}

export default RegisterFarmer;
