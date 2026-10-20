import { useEffect, useMemo, useRef, useState } from "react";
import RouteLink from "../../components/RouteLink.jsx";
import {
  FARMER_REGISTRATION_FIELDS,
  FARMER_REGISTRATION_LANGUAGES,
  normalize,
  phoneReadback,
  validateFarmerAnswer,
} from "../../lib/farmerRegistrationSteps.js";
import { createVoiceApi } from "../../lib/voiceApi.js";
import { createVoiceRecorder } from "../../lib/voiceRecorder.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function RegisterFarmer({ onNavigate }) {
  const [language, setLanguage] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState("language");
  const [answers, setAnswers] = useState({});
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [readbackReady, setReadbackReady] = useState(false);
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
  const answerVersionRef = useRef(0);
  const voiceApi = useMemo(() => createVoiceApi(), []);
  const languageConfig = language
    ? FARMER_REGISTRATION_LANGUAGES[language]
    : null;
  const field = FARMER_REGISTRATION_FIELDS[stepIndex];
  const step = languageConfig?.steps[field];
  const isBusy = ["speaking", "requesting", "recording", "transcribing"].includes(
    phase,
  );

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

  async function playQuestion(currentLanguage, operation) {
    const config = FARMER_REGISTRATION_LANGUAGES[currentLanguage];
    const currentField = FARMER_REGISTRATION_FIELDS[stepIndex];

    try {
      await voiceApi.speak(
        audioRef.current,
        currentLanguage,
        config.steps[currentField].prompt,
      );
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setStatus(config.actions.voiceFallback);
      }
    }

    if (mountedRef.current && operationRef.current === operation) {
      changePhase("ready");
    }
  }

  async function chooseLanguage(selectedLanguage) {
    if (phaseRef.current !== "language") {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setLanguage(selectedLanguage);
    setStatus("");
    changePhase("speaking");

    const config = FARMER_REGISTRATION_LANGUAGES[selectedLanguage];
    try {
      await voiceApi.speak(audioRef.current, selectedLanguage, config.intro);
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }
      await voiceApi.speak(
        audioRef.current,
        selectedLanguage,
        config.steps[FARMER_REGISTRATION_FIELDS[0]].prompt,
      );
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setStatus(config.actions.voiceFallback);
      }
    }

    if (mountedRef.current && operationRef.current === operation) {
      changePhase("ready");
    }
  }

  function replayQuestion() {
    if (!language || isBusy || phaseRef.current === "done") {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setStatus("");
    changePhase("speaking");
    void playQuestion(language, operation);
  }

  async function repeatAfter(message) {
    if (!language) {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setValue("");
    answerVersionRef.current += 1;
    setReadbackReady(false);
    changePhase("speaking");

    try {
      await voiceApi.speak(audioRef.current, language, message);
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setStatus(FARMER_REGISTRATION_LANGUAGES[language].actions.voiceFallback);
      }
    }

    if (mountedRef.current && operationRef.current === operation) {
      await playQuestion(language, operation);
    }
  }

  async function readBackAnswer(answer, operation) {
    const config = FARMER_REGISTRATION_LANGUAGES[language];
    const answerVersion = answerVersionRef.current;
    const spokenAnswer =
      field === "phone" ? phoneReadback(answer, language) : answer;
    const confirmation = `${config.confirmPrefix}: ${spokenAnswer}. ${config.confirmQuestion}`;

    changePhase("confirming");
    setReadbackReady(false);
    try {
      await voiceApi.speak(audioRef.current, language, confirmation);
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setStatus(
          FARMER_REGISTRATION_LANGUAGES[language].actions.readbackFallback,
        );
      }
    }

    if (
      mountedRef.current &&
      operationRef.current === operation &&
      answerVersionRef.current === answerVersion
    ) {
      setReadbackReady(true);
    }
  }

  async function startRecording() {
    if (!language || !["ready", "confirming"].includes(phaseRef.current)) {
      return;
    }

    voiceApi.stop(audioRef.current);
    setStatus("");
    answerVersionRef.current += 1;
    setValue("");
    setReadbackReady(false);
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
        setStatus(languageConfig.retry);
        await repeatAfter(languageConfig.retry);
        return;
      }

      setValue(transcript);
      setStatus("");
      await readBackAnswer(transcript, operation);
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) {
        return;
      }

      recorderRef.current = null;
      if (error.name === "AbortError") {
        changePhase("ready");
        return;
      }

      const actions = FARMER_REGISTRATION_LANGUAGES[language].actions;
      setStatus(
        error.name === "NotAllowedError" || error.name === "SecurityError"
          ? actions.micDenied
          : actions.micFallback,
      );
      changePhase("ready");
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
    answerVersionRef.current += 1;
    setValue(event.target.value);
    if (phaseRef.current === "confirming") {
      setReadbackReady(false);
    }
  }

  async function reviewTypedAnswer() {
    if (!value.trim() || !["ready", "confirming"].includes(phaseRef.current)) {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setStatus("");
    await readBackAnswer(value.trim(), operation);
  }

  async function acceptAnswer() {
    if (phaseRef.current !== "confirming" || !readbackReady) {
      return;
    }

    const validationError = validateFarmerAnswer(field, value);
    if (validationError) {
      const message =
        validationError === "phone"
          ? languageConfig.invalidPhone
          : validationError === "acres"
            ? languageConfig.invalidAcres
            : languageConfig.retry;
      setStatus(message);
      await repeatAfter(message);
      return;
    }

    const normalized = normalize(field, value);
    const completedAnswers = { ...answers, [field]: normalized };

    if (stepIndex === FARMER_REGISTRATION_FIELDS.length - 1) {
      setAnswers(completedAnswers);
      setStatus("");
      changePhase("documents");
      void speakDocumentGuide();
      return;
    }

    setAnswers(completedAnswers);
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    answerVersionRef.current += 1;
    setValue("");
    setReadbackReady(false);
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setStatus("");
    changePhase("speaking");
    try {
      await voiceApi.speak(
        audioRef.current,
        language,
        languageConfig.steps[FARMER_REGISTRATION_FIELDS[nextIndex]].prompt,
      );
    } catch {
      if (mountedRef.current && operationRef.current === operation) {
        setStatus(languageConfig.actions.voiceFallback);
      }
    }

    if (mountedRef.current && operationRef.current === operation) {
      changePhase("ready");
    }
  }

  async function speakDocumentGuide() {
    if (!language || phaseRef.current !== "documents") {
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setDocumentVoicePhase("speaking");
    setDocumentVoiceStatus("");
    try {
      await voiceApi.speak(
        audioRef.current,
        language,
        FARMER_REGISTRATION_LANGUAGES[language].documentGuide,
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
        await voiceApi.speak(
          audioRef.current,
          language,
          languageConfig.documentGuide,
        );
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
        setStatus(
          response.status === 409
            ? languageConfig.duplicatePhone
            : result.message || languageConfig.saveFailed,
        );
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
      try {
        await voiceApi.speak(audioRef.current, language, languageConfig.done);
      } catch {
        if (mountedRef.current && operationRef.current === operation) {
          setStatus(languageConfig.actions.voiceFallback);
        }
      }
    }
  }

  function rejectAnswer() {
    if (phaseRef.current !== "confirming") {
      return;
    }
    void repeatAfter(languageConfig.retry);
  }

  const actions = languageConfig?.actions;
  const microphoneLabel =
    phase === "recording"
      ? actions?.stop || "Stop listening"
      : phase === "requesting"
        ? actions?.requesting || "Starting microphone..."
        : actions?.start || "Start speaking";
  const isDocumentVoiceBusy = documentVoicePhase !== "idle";

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
          <h1 className="mb-3 text-3xl font-extrabold leading-tight text-emerald-950 sm:text-4xl">
            Choose your language
          </h1>
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
                  {config.name}
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
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-lg font-extrabold text-emerald-950">
                {stepIndex + 1} / {FARMER_REGISTRATION_FIELDS.length}
              </p>
              <button
                className="min-h-12 rounded-xl border-2 border-emerald-900 px-4 text-base font-bold text-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy || isSubmitting}
                onClick={replayQuestion}
                type="button"
              >
                {languageConfig.actions.replay}
              </button>
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

          <p className="mb-6 text-2xl font-extrabold leading-snug text-slate-950 sm:text-3xl">
            {step.prompt}
          </p>

          <button
            className={`mb-6 min-h-16 w-full rounded-2xl border-2 px-5 py-4 text-xl font-extrabold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              phase === "recording"
                ? "border-red-900 bg-red-800 hover:bg-red-900"
                : "border-emerald-950 bg-emerald-800 hover:bg-emerald-900"
            }`}
            disabled={
              isSubmitting ||
              ["speaking", "requesting", "transcribing"].includes(phase)
            }
            onClick={handleMicrophone}
            type="button"
          >
            {microphoneLabel}
          </button>

          <label
            className="mb-2 block text-lg font-bold text-slate-950"
            htmlFor="farmer-answer"
          >
            {step.label}
          </label>
          <input
            autoComplete={field === "phone" ? "tel" : "off"}
            className="min-h-14 w-full rounded-xl border-2 border-slate-700 bg-white px-4 py-3 text-xl text-slate-950 placeholder:text-slate-500 focus:border-emerald-800 focus:outline-4 focus:outline-emerald-200"
            id="farmer-answer"
            maxLength={field === "phone" ? 15 : 100}
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

          {status && (
            <p
              className="mt-4 rounded-xl border-2 border-amber-700 bg-amber-50 p-4 text-base font-semibold text-slate-950"
              role="status"
            >
              {status}
            </p>
          )}

          {phase === "confirming" ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                className="min-h-16 rounded-2xl border-2 border-emerald-950 bg-emerald-800 px-5 py-4 text-xl font-extrabold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!readbackReady || !value.trim() || isSubmitting}
                onClick={() => void acceptAnswer()}
                type="button"
              >
                {isSubmitting ? languageConfig.saving : languageConfig.actions.yes}
              </button>
              <button
                className="min-h-16 rounded-2xl border-2 border-red-900 bg-white px-5 py-4 text-xl font-extrabold text-red-950 hover:bg-red-50"
                disabled={isSubmitting}
                onClick={rejectAnswer}
                type="button"
              >
                {languageConfig.actions.no}
              </button>
              {!readbackReady && (
                <button
                  className="min-h-14 rounded-xl border-2 border-slate-700 px-4 py-3 text-lg font-bold text-slate-950 sm:col-span-2"
                  disabled={isBusy || isSubmitting || !value.trim()}
                  onClick={() => void reviewTypedAnswer()}
                  type="button"
                >
                  {languageConfig.actions.readAgain}
                </button>
              )}
            </div>
          ) : (
            <button
              className="mt-5 min-h-14 w-full rounded-xl border-2 border-emerald-950 bg-emerald-100 px-5 py-3 text-lg font-extrabold text-emerald-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!value.trim() || isBusy || isSubmitting}
              onClick={() => void reviewTypedAnswer()}
              type="button"
            >
              {languageConfig.actions.review}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default RegisterFarmer;
