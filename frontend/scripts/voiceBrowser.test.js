import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { FARMER_REGISTRATION_FIELDS, FARMER_REGISTRATION_LANGUAGES } from "../src/lib/farmerRegistrationSteps.js";

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const chromeCandidates = [
  process.env.CHROME_BIN,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
const baseUrl = "http://127.0.0.1:5177";
let viteProcess;
let browser;

function createSilentWav() {
  const bytes = Buffer.alloc(44 + 480);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(48000, 24);
  bytes.writeUInt32LE(96000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}

async function waitForVite() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (viteProcess.exitCode !== null) {
      throw new Error(`Vite exited with code ${viteProcess.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("Vite did not become ready for the browser test");
}

async function installVoiceMocks(page, transcripts = []) {
  const requests = { tts: [], stt: [] };
  await installFakeMicrophone(page);
  await page.route("**/api/voice/tts", async (route) => {
    requests.tts.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: createSilentWav(),
    });
  });
  await page.route("**/api/voice/stt", async (route) => {
    const request = route.request();
    const body = request.postDataBuffer();
    const offset = body.indexOf(Buffer.from("RIFF"));
    assert.notEqual(offset, -1, "STT request includes a WAV file");
    const header = new DataView(body.buffer, body.byteOffset + offset, 44);
    assert.equal(header.getUint16(20, true), 1);
    assert.equal(header.getUint16(22, true), 1);
    assert.equal(header.getUint32(24, true), 16000);
    assert.equal(header.getUint16(34, true), 16);
    requests.stt.push(request);
    const transcript = transcripts.shift();
    assert.notEqual(transcript, undefined, "a canned transcript is available");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ transcript }),
    });
  });
  return requests;
}

async function clickByName(page, name) {
  await page.getByRole("button", { name }).click();
}

async function waitForCount(items, count, label) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (items.length >= count) return;
    await delay(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function installFakeMicrophone(page) {
  await page.addInitScript(() => {
    const wav = new Uint8Array(524);
    const view = new DataView(wav.buffer);
    const marker = (offset, value) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    };

    marker(0, "RIFF");
    view.setUint32(4, wav.length - 8, true);
    marker(8, "WAVE");
    marker(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 48000, true);
    view.setUint32(28, 96000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    marker(36, "data");
    view.setUint32(40, wav.length - 44, true);
    const audio = new Blob([wav], { type: "audio/wav" });

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    });

    window.MediaRecorder = class {
      constructor() {
        this.state = "inactive";
        this.mimeType = "audio/wav";
        this.listeners = new Map();
      }

      addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
      }

      start() {
        this.state = "recording";
      }

      stop() {
        if (this.state !== "recording") return;
        this.state = "inactive";
        const dataEvent = new Event("dataavailable");
        Object.defineProperty(dataEvent, "data", { value: audio });
        for (const listener of this.listeners.get("dataavailable") || []) {
          listener(dataEvent);
        }
        queueMicrotask(() => {
          for (const listener of this.listeners.get("stop") || []) {
            listener(new Event("stop"));
          }
        });
      }
    };
  });
}

async function captureAnswer(page, actions) {
  await clickByName(page, actions.mic);
  await page.getByRole("button", { name: actions.stop }).waitFor();
  await delay(200);
  await clickByName(page, actions.stop);
}

async function completeTypedAnswers(page, language, answers) {
  for (const [index, answer] of answers.entries()) {
    await page.locator("#farmer-answer").fill(answer);
    await clickByName(page, language.proceed);
    if (index < answers.length - 1) {
      await page.getByLabel(language.labels[index + 1]).waitFor();
    }
  }
}

async function completeDocumentSubmission(page) {
  const pdf = Buffer.from("%PDF-1.4\nbrowser test");
  await page.locator("#aadhaar-document").setInputFiles({
    name: "aadhaar.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.locator("#land-document").setInputFiles({
    name: "land.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.locator("#farmer-password").fill("safe-test-password");
  await page.locator("#farmer-confirm-password").fill("safe-test-password");
  await clickByName(page, "Submit for verification");
}

const languages = [
  {
    code: "en-IN",
    button: "English",
    mic: "Speak your answer",
    stop: "Stop recording",
    proceed: "Proceed",
    listen: "Listen",
    heard: "Please check what we heard",
    done: "Your details are saved.",
    complete: "Details complete",
    labels: ["Full name", "Mobile number", "Village", "District", "State", "Land in acres", "Main crop"],
    answers: ["Ravi Kumar", "9876543210", "Nashik", "Pune", "Maharashtra", "1.5", "Wheat"],
    phoneReadback: "nine eight seven six five four three two one zero",
  },
  {
    code: "mr-IN",
    button: "मराठी",
    mic: "तुमचे उत्तर बोला",
    stop: "रेकॉर्डिंग थांबवा",
    proceed: "पुढे चला",
    listen: "ऐका",
    heard: "आम्ही ऐकलेले उत्तर तपासा",
    done: "तुमची माहिती जतन झाली आहे.",
    complete: "माहिती पूर्ण",
    labels: ["पूर्ण नाव", "मोबाईल क्रमांक", "गाव", "जिल्हा", "राज्य", "जमीन (एकर)", "मुख्य पीक"],
    answers: ["रवि कुमार", "9876543210", "नाशिक", "पुणे", "महाराष्ट्र", "1.5", "गहू"],
    phoneReadback: "नऊ आठ सात सहा पाच चार तीन दोन एक शून्य",
  },
  {
    code: "hi-IN",
    button: "हिंदी",
    mic: "अपना जवाब बोलें",
    stop: "रिकॉर्डिंग रोकें",
    proceed: "आगे बढ़ें",
    listen: "सुनें",
    heard: "सुने हुए जवाब को जाँचें",
    done: "आपकी जानकारी सहेज ली गई है।",
    complete: "जानकारी पूरी हुई",
    labels: ["पूरा नाम", "मोबाइल नंबर", "गाँव", "जिला", "राज्य", "जमीन (एकड़)", "मुख्य फसल"],
    answers: ["रवि कुमार", "9876543210", "नासिक", "पुणे", "महाराष्ट्र", "1.5", "गेहूँ"],
    phoneReadback: "नौ आठ सात छह पाँच चार तीन दो एक शून्य",
  },
];

before(async () => {
  const viteEntry = path.join(frontendRoot, "node_modules", "vite", "bin", "vite.js");
  viteProcess = spawn(
    process.execPath,
    [viteEntry, "--host", "127.0.0.1", "--port", "5177", "--strictPort"],
    { cwd: frontendRoot, stdio: "ignore" },
  );
  await waitForVite();
  browser = await chromium.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
});

after(async () => {
  await browser?.close();
  viteProcess?.kill();
});

test("registration chooser still routes to the farmer and donor pages", async () => {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.getByRole("navigation").getByRole("link", { name: "Register" }).click();
  await page.getByRole("heading", { name: "Choose how to register" }).waitFor();
  await page.getByRole("link", { name: /Register as Farmer/ }).click();
  await page.getByRole("heading", { name: "Choose your language" }).waitFor();
  await page.goto(`${baseUrl}/register/donor`);
  await page.getByRole("heading", { name: "Create account" }).waitFor();
  await page.close();
});

for (const language of languages) {
  test(`voice answers proceed to document upload in ${language.code}`, async () => {
    const context = await browser.newContext({ permissions: ["microphone"] });
    const page = await context.newPage();
    const requests = await installVoiceMocks(page, [...language.answers]);
    await page.route("**/api/farmers/register", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          farmer: { verificationStatus: "pending" },
          message: "Registration and documents submitted.",
        }),
      }),
    );
    await page.goto(`${baseUrl}/register/farmer`);
    await page.getByRole("button", { name: "Voice On" }).waitFor();
    await clickByName(page, language.button);
    await page.getByLabel(language.labels[0]).waitFor();
    await waitForCount(requests.tts, 2, "intro and first question TTS");

    assert.equal(requests.tts[0]?.language, language.code);
    assert.equal(requests.tts[0]?.text, {
      "en-IN": "Welcome to SevaVoice. I will ask one question at a time.",
      "mr-IN": "सेवावॉइसमध्ये आपले स्वागत आहे. आपण एकेक प्रश्नाचे उत्तर देऊ शकता.",
      "hi-IN": "सेवावॉइस में आपका स्वागत है। आप एक-एक सवाल का जवाब दे सकते हैं।",
    }[language.code]);
    assert.equal(requests.tts[1]?.text, {
      "en-IN": "What is your full name?",
      "mr-IN": "तुमचे पूर्ण नाव काय आहे?",
      "hi-IN": "आपका पूरा नाम क्या है?",
    }[language.code]);

    for (const [index, answer] of language.answers.entries()) {
      await captureAnswer(page, language);
      await page.getByTestId("voice-confirmation").waitFor();
      assert.ok(
        (await page.getByTestId("voice-confirmation").innerText()).includes(answer),
      );
      await clickByName(page, language.proceed);
      if (index < language.answers.length - 1) {
        await page.getByLabel(language.labels[index + 1]).waitFor();
      }
    }

    await page.getByRole("heading", { name: "Upload required documents" }).waitFor();
    await waitForCount(requests.tts, 16, "document instructions TTS");
    assert.ok(
      requests.tts.some((request) => request.text.includes(language.phoneReadback)),
      "voice-captured phone is read back digit by digit",
    );
    assert.equal(requests.stt.length, language.answers.length);
    const config = FARMER_REGISTRATION_LANGUAGES[language.code];
    for (const field of FARMER_REGISTRATION_FIELDS) {
      assert.equal(
        requests.tts.filter((request) => request.text === config.steps[field].prompt)
          .length,
        1,
        `question ${field} is spoken once`,
      );
    }
    assert.equal(requests.tts.length, 16);
    await completeDocumentSubmission(page);
    await page.getByRole("heading", { name: language.complete }).waitFor();
    await page.getByText(language.done, { exact: true }).waitFor();
    await context.close();
  });
}

test("voice off persists and lets typed answers reach documents without voice requests", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = await installVoiceMocks(page);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "Voice On");
  await page.getByRole("button", { name: "Voice Off" }).waitFor();
  await clickByName(page, "English");
  await page.getByLabel(languages[0].labels[0]).waitFor();
  await completeTypedAnswers(page, languages[0], languages[0].answers);
  await page.getByRole("heading", { name: "Upload required documents" }).waitFor();
  assert.equal(requests.tts.length, 0);
  assert.equal(requests.stt.length, 0);

  await page.reload();
  await page.getByRole("button", { name: "Voice Off" }).waitFor();
  await clickByName(page, "English");
  await page.getByLabel(languages[0].labels[0]).waitFor();
  assert.equal(requests.tts.length, 0);
  assert.equal(requests.stt.length, 0);
  await context.close();
});

test("voice defaults on when localStorage throws", async () => {
  const page = await browser.newPage();
  const requests = await installVoiceMocks(page);
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      configurable: true,
      value() {
        throw new Error("storage unavailable");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value() {
        throw new Error("storage unavailable");
      },
    });
  });
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.getByLabel(languages[0].labels[0]).waitFor();
  await waitForCount(requests.tts, 2, "intro and first question TTS");
  assert.equal(requests.tts.length, 2);
  await page.close();
});

test("turning voice off aborts pending TTS and discards a late response", async () => {
  const page = await browser.newPage();
  let markStarted;
  let releaseLateResponse;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const lateResponse = new Promise((resolve) => {
    releaseLateResponse = resolve;
  });
  let ttsCount = 0;
  await page.addInitScript(() => {
    window.__audioPlayCalls = 0;
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play() {
      window.__audioPlayCalls += 1;
      return originalPlay.call(this);
    };
  });
  await page.route("**/api/voice/tts", async (route) => {
    ttsCount += 1;
    markStarted();
    await lateResponse;
    try {
      await route.fulfill({
        status: 200,
        contentType: "audio/wav",
        body: createSilentWav(),
      });
    } catch {
      // The fetch is intentionally aborted before this late response.
    }
  });
  await page.route("**/api/voice/stt", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ transcript: "" }) }),
  );
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await started;
  const aborted = new Promise((resolve) => {
    page.on("requestfailed", (request) => {
      if (request.url().includes("/api/voice/tts")) resolve();
    });
  });
  await clickByName(page, "Voice On");
  await aborted;
  releaseLateResponse();
  await page.locator("#farmer-answer").fill("Ravi Kumar");
  await clickByName(page, "Proceed");
  await page.getByLabel("Mobile number").waitFor();
  await delay(100);
  assert.equal(ttsCount, 1);
  assert.equal(await page.evaluate(() => window.__audioPlayCalls), 1);
  await page.close();
});

test("voice-off Listen plays once; STT waits for Mic then Stop and Mic interrupts playback", async () => {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  const requests = await installVoiceMocks(page, ["Ravi Kumar"]);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "Voice On");
  await clickByName(page, "English");
  await page.getByLabel("Full name").waitFor();
  assert.equal(requests.tts.length, 0);

  const ttsResponse = page.waitForResponse((response) =>
    response.url().includes("/api/voice/tts"),
  );
  await clickByName(page, "Listen");
  await ttsResponse;
  assert.equal(requests.tts.length, 1);

  const pauseBeforeMic = await page.locator("audio").evaluate((audio) => {
    window.__pauseCount = 0;
    const originalPause = audio.pause.bind(audio);
    audio.pause = () => {
      window.__pauseCount += 1;
      return originalPause();
    };
    return window.__pauseCount;
  });
  assert.equal(pauseBeforeMic, 0);
  await clickByName(page, "Speak your answer");
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  assert.ok(await page.locator("audio").evaluate(() => window.__pauseCount > 0));
  assert.equal(requests.stt.length, 0);
  await delay(200);
  await clickByName(page, "Stop recording");
  await page.getByTestId("voice-confirmation").waitFor();
  assert.equal(requests.stt.length, 1);
  await context.close();
});

test("typed answers skip confirmation and rapid Proceed advances only once", async () => {
  const page = await browser.newPage();
  const requests = await installVoiceMocks(page);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.getByLabel("Full name").waitFor();
  await page.locator("#farmer-answer").fill("Ravi Kumar");
  await page.getByRole("button", { name: "Proceed" }).evaluate((button) => {
    button.click();
    button.click();
  });
  await page.getByLabel("Mobile number").waitFor();
  assert.equal(await page.getByTestId("voice-confirmation").count(), 0);
  assert.equal(
    requests.tts.filter((request) => request.text === "What is your village?").length,
    0,
  );
  await delay(100);
  assert.equal(
    requests.tts.filter((request) => request.text === "Please say your ten-digit mobile number.").length,
    1,
  );
  await page.close();
});

test("inline validation reports specific phone and acreage codes and clears on edit", async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem("sevavoice.voiceGuide", "off"));
  await installVoiceMocks(page);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.locator("#farmer-answer").fill("Ravi Kumar");
  await clickByName(page, "Proceed");

  for (const [answer, code] of [
    ["", "required"],
    ["98765432", "phone_short"],
    ["98765432101", "phone_long"],
    ["letters", "phone_digits"],
    ["5123456789", "phone_start"],
  ]) {
    await page.locator("#farmer-answer").fill(answer);
    await clickByName(page, "Proceed");
    assert.equal(
      await page.locator("#farmer-answer-error").getAttribute("data-validation-code"),
      code,
    );
    assert.equal(await page.locator("#farmer-answer").getAttribute("aria-invalid"), "true");
  }
  await page.locator("#farmer-answer").fill("9876543210");
  assert.equal(await page.locator("#farmer-answer-error").count(), 0);
  await clickByName(page, "Proceed");

  for (const answer of ["Nashik", "Nashik", "Maharashtra"]) {
    await page.locator("#farmer-answer").fill(answer);
    await clickByName(page, "Proceed");
  }
  for (const [answer, code] of [
    ["0", "acres_positive"],
    ["-1", "acres_positive"],
    ["many", "acres_number"],
    ["10001", "acres_max"],
  ]) {
    await page.locator("#farmer-answer").fill(answer);
    await clickByName(page, "Proceed");
    assert.equal(
      await page.locator("#farmer-answer-error").getAttribute("data-validation-code"),
      code,
    );
  }
  await page.close();
});

test("validation speech is static and only requested once until the answer changes", async () => {
  const page = await browser.newPage();
  const requests = await installVoiceMocks(page);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.getByLabel("Full name").waitFor();
  await waitForCount(requests.tts, 2, "intro and first question TTS");
  await page.locator("#farmer-answer").fill("Ravi Kumar");
  await clickByName(page, "Proceed");
  await page.getByLabel("Mobile number").waitFor();
  await waitForCount(requests.tts, 3, "mobile question TTS");
  await delay(100);
  await page.locator("#farmer-answer").fill("987654321");
  await clickByName(page, "Proceed");
  await page.locator("#farmer-answer-error").waitFor();
  await waitForCount(requests.tts, 4, "static spoken mobile error");
  assert.equal(
    requests.tts.filter(
      (request) => request.text === "A mobile number needs ten digits.",
    ).length,
    1,
  );
  await clickByName(page, "Proceed");
  await delay(100);
  assert.equal(
    requests.tts.filter(
      (request) => request.text === "A mobile number needs ten digits.",
    ).length,
    1,
  );
  await page.close();
});

test("voice transcript requires review, becomes typed on edit, and validates on Proceed", async () => {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("sevavoice.voiceGuide", "off"));
  const requests = await installVoiceMocks(page, ["987654321"]);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.locator("#farmer-answer").fill("Ravi Kumar");
  await clickByName(page, "Proceed");
  await captureAnswer(page, languages[0]);
  await page.getByTestId("voice-confirmation").waitFor();
  await clickByName(page, "Proceed");
  assert.equal(
    await page.locator("#farmer-answer-error").getAttribute("data-validation-code"),
    "phone_short",
  );
  await page.locator("#farmer-answer").fill("9876543210");
  assert.equal(await page.getByTestId("voice-confirmation").count(), 0);
  assert.equal(requests.stt.length, 1);
  await context.close();
});

test("empty speech transcript stays editable with an inline retry message", async () => {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  const requests = await installVoiceMocks(page, [""]);
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.getByLabel("Full name").waitFor();
  await captureAnswer(page, languages[0]);
  await page.getByRole("status").waitFor();
  assert.match(
    await page.getByRole("status").innerText(),
    /We couldn't hear that/,
  );
  assert.equal(await page.getByTestId("voice-confirmation").count(), 0);
  assert.equal(await page.locator("#farmer-answer").isEnabled(), true);
  assert.equal(requests.stt.length, 1);
  await context.close();
});

test("automatic speech failures show a message without blocking typing", async () => {
  const page = await browser.newPage();
  await page.route("**/api/voice/tts", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Voice service not configured" }),
    }),
  );
  await page.route("**/api/voice/stt", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ transcript: "" }),
    }),
  );
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await page.getByLabel("Full name").waitFor();
  await page.getByRole("status").waitFor();
  assert.match(
    await page.getByRole("status").innerText(),
    /Voice playback is unavailable/,
  );
  await page.locator("#farmer-answer").fill("Ravi Kumar");
  assert.equal(await page.locator("#farmer-answer").isEnabled(), true);
  await clickByName(page, "Proceed");
  await page.getByLabel("Mobile number").waitFor();
  await page.close();
});

test("server duplicate and field validation errors return to the owning step", async () => {
  for (const responseBody of [
    { status: 409, body: { message: "duplicate" }, field: "phone", code: "duplicate" },
    {
      status: 400,
      body: { fieldErrors: { fullName: "invalid" } },
      field: "name",
      code: "server_invalid",
    },
  ]) {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem("sevavoice.voiceGuide", "off"));
    await installVoiceMocks(page);
    await page.route("**/api/farmers/register", (route) =>
      route.fulfill({
        status: responseBody.status,
        contentType: "application/json",
        body: JSON.stringify(responseBody.body),
      }),
    );
    await page.goto(`${baseUrl}/register/farmer`);
    await clickByName(page, "English");
    await completeTypedAnswers(page, languages[0], languages[0].answers);
    await page.getByRole("heading", { name: "Upload required documents" }).waitFor();
    await completeDocumentSubmission(page);
    const expectedIndex = responseBody.field === "phone" ? "2" : "1";
    await page.getByRole("progressbar").waitFor();
    assert.equal(
      await page.getByRole("progressbar").getAttribute("aria-valuenow"),
      expectedIndex,
    );
    assert.equal(
      await page.locator("#farmer-answer-error").getAttribute("data-validation-code"),
      responseBody.code,
    );
    await page.close();
  }
});
