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
      if (response.ok) {
        return;
      }
    } catch {
      await delay(250);
    }
  }

  throw new Error("Vite did not become ready for the browser test");
}

async function installVoiceMocks(page, transcripts) {
  const ttsRequests = [];
  const audioFiles = [];
  await page.route("**/api/voice/tts", async (route) => {
    ttsRequests.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: createSilentWav(),
    });
  });
  await page.route("**/api/voice/stt", async (route) => {
    const request = route.request();
    const body = request.postDataBuffer();
    const marker = Buffer.from("RIFF");
    const wavOffset = body.indexOf(marker);
    assert.notEqual(wavOffset, -1, "STT request contains a WAV file");
    const header = new DataView(
      body.buffer,
      body.byteOffset + wavOffset,
      44,
    );
    const requestText = body.toString("latin1");
    assert.match(requestText, /filename="recording\.wav"/);
    assert.match(requestText, /Content-Type: audio\/wav/i);
    assert.ok(body.length - wavOffset > 44, "WAV contains recorded samples");
    assert.equal(header.getUint16(20, true), 1, "WAV is PCM");
    assert.equal(header.getUint16(22, true), 1, "WAV is mono");
    assert.equal(header.getUint32(24, true), 16000, "WAV is 16kHz");
    assert.equal(header.getUint16(34, true), 16, "WAV uses 16-bit samples");
    audioFiles.push({
      requestText,
      size: body.length - wavOffset,
      trackState: await page.evaluate(
        () => globalThis.__voiceTestTrack?.readyState,
      ),
    });

    const transcript = transcripts.shift();
    assert.notEqual(transcript, undefined, "a canned transcript is available");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ transcript }),
    });
  });

  return { ttsRequests, audioFiles };
}

async function clickByName(page, name) {
  await page.getByRole("button", { name }).click();
}

async function captureAnswer(page, actions) {
  await clickByName(page, actions.start);
  await page.getByRole("button", { name: actions.stop }).waitFor();
  await delay(250);
  await clickByName(page, actions.stop);
}

async function confirmCurrentAnswer(page, actions) {
  await page.getByRole("button", { name: actions.yes }).waitFor();
  await clickByName(page, actions.yes);
}

async function completeTypedAnswers(page, answers, actions) {
  for (const [index, answer] of answers.entries()) {
    await page.locator("#farmer-answer").fill(answer);
    await clickByName(page, actions.review);
    await page.getByRole("button", { name: actions.yes }).waitFor();
    await clickByName(page, actions.yes);
    if (index < answers.length - 1) {
      await page.getByRole("button", { name: actions.start }).waitFor();
    }
  }
}

before(async () => {
  const viteEntry = path.join(
    frontendRoot,
    "node_modules",
    "vite",
    "bin",
    "vite.js",
  );
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

test("renders both registration pages and protects role dashboards", async () => {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.getByRole("navigation").getByRole("link", { name: "Register" }).click();
  await page.getByRole("heading", { name: "Choose how to register" }).waitFor();
  await page.getByRole("link", { name: /Register as Donor/ }).click();
  await page.getByRole("heading", { name: "Create account" }).waitFor();

  await page.goto(`${baseUrl}/login`);
  await page
    .locator(".login-panel")
    .getByRole("link", { name: "Register" })
    .click();
  await page.getByRole("heading", { name: "Choose how to register" }).waitFor();
  await page.getByRole("link", { name: /Register as Farmer/ }).click();
  await page.waitForURL("**/register/farmer");
  await page.getByRole("heading", { name: "Choose your language" }).waitFor();

  await page.goto(`${baseUrl}/register`);
  await page.getByRole("heading", { name: "Choose how to register" }).waitFor();
  await page.getByRole("link", { name: /Register as Farmer/ }).click();
  await page.waitForURL("**/register/farmer");
  await page.getByRole("heading", { name: "Choose your language" }).waitFor();

  await page.goto(`${baseUrl}/register/donor`);
  await page.getByRole("heading", { name: "Create account" }).waitFor();

  await page.goto(`${baseUrl}/register/farmer`);
  await page.getByRole("heading", { name: "Choose your language" }).waitFor();

  await page.goto(`${baseUrl}/farmer`);
  await page.waitForURL("**/login");
  await page.getByRole("heading", { name: "Login" }).waitFor();
  await page.close();
});

for (const language of [
  {
    code: "en-IN",
    button: "English",
    completeTitle: "Details complete",
    doneText: "Your details are saved.",
    loginLabel: "Go to login",
    actions: {
      start: "Start speaking",
      stop: "Stop listening",
      review: "Review my answer",
      yes: /Yes, correct/,
      no: /No, try again/,
    },
    confirmDigits: "nine eight seven six five four three two one zero",
    values: [
      "",
      "Ravi",
      "Ravi Kumar",
      "123",
      "9876543210",
      "Nashik",
      "Nashik",
      "Maharashtra",
      "1.5",
      "Wheat",
    ],
    nextLabels: [
      "Full name",
      "Mobile number",
      "Village",
      "District",
      "State",
      "Land in acres",
      "Main crop",
    ],
  },
  {
    code: "mr-IN",
    button: "मराठी",
    completeTitle: "माहिती पूर्ण",
    doneText: "तुमची माहिती जतन झाली आहे.",
    loginLabel: "लॉगिन पृष्ठावर जा",
    actions: {
      start: "बोलायला सुरुवात करा",
      stop: "ऐकणे थांबवा",
      review: "माझे उत्तर तपासा",
      yes: /हो, बरोबर/,
      no: /नाही, पुन्हा प्रयत्न करा/,
    },
    confirmDigits: "नऊ आठ सात सहा पाच चार तीन दोन एक शून्य",
    values: [
      "",
      "रवि",
      "रवि कुमार",
      "123",
      "9876543210",
      "नाशिक",
      "नाशिक",
      "महाराष्ट्र",
      "1.5",
      "गहू",
    ],
    nextLabels: [
      "पूर्ण नाव",
      "मोबाईल क्रमांक",
      "गाव",
      "जिल्हा",
      "राज्य",
      "जमीन (एकर)",
      "मुख्य पीक",
    ],
  },
  {
    code: "hi-IN",
    button: "हिंदी",
    completeTitle: "जानकारी पूरी हुई",
    doneText: "आपकी जानकारी सहेज ली गई है।",
    loginLabel: "लॉगिन पृष्ठ पर जाएँ",
    actions: {
      start: "बोलना शुरू करें",
      stop: "सुनना बंद करें",
      review: "मेरा जवाब जाँचें",
      yes: /हाँ, सही/,
      no: /नहीं, फिर कोशिश करें/,
    },
    confirmDigits: "नौ आठ सात छह पाँच चार तीन दो एक शून्य",
    values: [
      "",
      "रवि",
      "रवि कुमार",
      "123",
      "9876543210",
      "नासिक",
      "नासिक",
      "महाराष्ट्र",
      "1.5",
      "गेहूँ",
    ],
    nextLabels: [
      "पूरा नाम",
      "मोबाइल नंबर",
      "गाँव",
      "जिला",
      "राज्य",
      "जमीन (एकड़)",
      "मुख्य फसल",
    ],
  },
]) {
  test(`completes all farmer voice steps in ${language.code}`, async () => {
    const context = await browser.newContext({ permissions: ["microphone"] });
    const page = await context.newPage();
    const transcripts = [...language.values];
    const mocks = await installVoiceMocks(page, transcripts);
    let registration;
    await page.route("**/api/farmers/register", async (route) => {
      registration = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ farmer: { verificationStatus: "pending" } }),
      });
    });
    await page.addInitScript(() => {
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async (...args) => {
          const stream = await getUserMedia(...args);
          globalThis.__voiceTestTrack = stream.getAudioTracks()[0];
          return stream;
        },
      });
    });
    await page.goto(`${baseUrl}/register/farmer`);
    await clickByName(page, language.button);
    await page.getByRole("button", { name: language.actions.start }).waitFor();

    await captureAnswer(page, language.actions);
    await page.getByRole("status").waitFor();
    assert.match(
      await page.getByRole("status").innerText(),
      /could not understand|समझ नहीं आया|समजले नाही/i,
    );
    await page.getByRole("progressbar").getAttribute("aria-valuenow");
    await captureAnswer(page, language.actions);
    await page.getByRole("button", { name: language.actions.yes }).waitFor();
    await clickByName(page, language.actions.no);
    await page.getByRole("button", { name: language.actions.start }).waitFor();
    await captureAnswer(page, language.actions);
    await confirmCurrentAnswer(page, language.actions);
    assert.equal(
      await page.getByRole("progressbar").getAttribute("aria-valuenow"),
      "2",
    );

    await captureAnswer(page, language.actions);
    await page.getByRole("button", { name: language.actions.yes }).waitFor();
    await confirmCurrentAnswer(page, language.actions);
    await page.getByRole("button", { name: language.actions.start }).waitFor();
    assert.equal(
      await page.getByRole("progressbar").getAttribute("aria-valuenow"),
      "2",
      "invalid mobile numbers re-ask the current question",
    );

    await captureAnswer(page, language.actions);
    await confirmCurrentAnswer(page, language.actions);
    for (let index = 2; index < language.nextLabels.length; index += 1) {
      assert.equal(
        await page.getByRole("progressbar").getAttribute("aria-valuenow"),
        String(index + 1),
      );
      await captureAnswer(page, language.actions);
      await confirmCurrentAnswer(page, language.actions);
    }

    await page
      .getByRole("heading", { name: language.completeTitle })
      .waitFor();
    assert.ok(
      (await page.locator("main").innerText()).includes(language.doneText),
    );
    assert.deepEqual(registration, {
      fullName: language.values[2],
      mobileNumber: "9876543210",
      village: language.values[5],
      district: language.values[6],
      state: language.values[7],
      landSizeAcres: 1.5,
      cropType: language.values[9],
      preferredLanguage: language.code,
    });
    await page.getByRole("button", { name: language.loginLabel }).click();
    await page.waitForURL("**/login");
    assert.equal(transcripts.length, 0);
    assert.equal(mocks.audioFiles.length, language.values.length);
    assert.ok(mocks.audioFiles.every((file) => file.trackState === "ended"));
    assert.ok(mocks.audioFiles.every((file) => file.size > 1000));
    assert.ok(
      mocks.ttsRequests.some(
        (request) =>
          request.language === language.code &&
          request.text.includes(language.confirmDigits),
      ),
      "mobile number readback speaks each digit separately",
    );
    await context.close();
  });
}

test("keeps typing usable when mic permission and voice services fail", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      },
    });
  });
  await page.route("**/api/voice/tts", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Voice service not configured" }),
    }),
  );
  await page.route("**/api/voice/stt", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Voice service unavailable" }),
    }),
  );
  await page.goto(`${baseUrl}/register/farmer`);
  await clickByName(page, "English");
  await clickByName(page, "Start speaking");
  await page.getByRole("status").waitFor();
  assert.match(await page.getByRole("status").innerText(), /Microphone access was denied/);
  assert.equal(await page.locator("#farmer-answer").isEnabled(), true);
  await context.close();

  const errorContext = await browser.newContext({ permissions: ["microphone"] });
  const errorPage = await errorContext.newPage();
  await errorPage.addInitScript(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async (...args) => {
        const stream = await getUserMedia(...args);
        globalThis.__voiceTestTrack = stream.getAudioTracks()[0];
        return stream;
      },
    });
  });
  await errorPage.route("**/api/voice/tts", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Voice service unavailable" }),
    }),
  );
  await errorPage.route("**/api/voice/stt", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Voice service unavailable" }),
    }),
  );
  await errorPage.goto(`${baseUrl}/register/farmer`);
  await clickByName(errorPage, "English");
  await errorPage.getByRole("button", { name: "Start speaking" }).waitFor();
  await captureAnswer(errorPage, {
    start: "Start speaking",
    stop: "Stop listening",
  });
  await errorPage.getByRole("status").waitFor();
  assert.match(
    await errorPage.getByRole("status").innerText(),
    /Voice input is unavailable/,
  );
  assert.equal(await errorPage.locator("#farmer-answer").isEnabled(), true);
  await errorPage.locator("#farmer-answer").fill("Ravi Kumar");
  await clickByName(errorPage, "Review my answer");
  await errorPage.getByRole("button", { name: /Yes, correct/ }).waitFor();
  await errorContext.close();
});

test("shows farmer duplicate and network errors without a false success state", async () => {
  const actions = {
    start: "Start speaking",
    review: "Review my answer",
    yes: /Yes, correct/,
  };
  const answers = [
    "Test Farmer",
    "9000000001",
    "Test Village",
    "Test District",
    "Maharashtra",
    "1.5",
    "Test Crop",
  ];
  const duplicateContext = await browser.newContext();
  const duplicatePage = await duplicateContext.newPage();
  await installVoiceMocks(duplicatePage, []);
  await duplicatePage.route("**/api/farmers/register", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ message: "This number is already registered" }),
    }),
  );
  await duplicatePage.goto(`${baseUrl}/register/farmer`);
  await clickByName(duplicatePage, "English");
  await duplicatePage.getByRole("button", { name: actions.start }).waitFor();
  await completeTypedAnswers(duplicatePage, answers, actions);
  await duplicatePage.getByRole("status").waitFor();
  assert.match(
    await duplicatePage.getByRole("status").innerText(),
    /This mobile number is already registered/,
  );
  assert.equal(
    await duplicatePage.getByRole("heading", { name: "Details complete" }).count(),
    0,
  );
  await duplicateContext.close();

  const networkContext = await browser.newContext();
  const networkPage = await networkContext.newPage();
  const networkMocks = await installVoiceMocks(networkPage, []);
  await networkPage.route("**/api/farmers/register", (route) =>
    route.abort("failed"),
  );
  await networkPage.goto(`${baseUrl}/register/farmer`);
  await clickByName(networkPage, "English");
  await networkPage.getByRole("button", { name: actions.start }).waitFor();
  await completeTypedAnswers(networkPage, answers, actions);
  await networkPage.getByRole("status").waitFor();
  assert.match(
    await networkPage.getByRole("status").innerText(),
    /Your details could not be saved/,
  );
  assert.equal(
    await networkPage.getByRole("heading", { name: "Details complete" }).count(),
    0,
  );
  assert.equal(
    networkMocks.ttsRequests.some((request) =>
      request.text.includes("Your details are saved."),
    ),
    false,
  );
  await networkContext.close();
});
