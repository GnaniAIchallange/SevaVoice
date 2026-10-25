import assert from "node:assert/strict";
import test from "node:test";
import { extractAssistanceRequest } from "./requestExtractor.js";

test("requestExtractor extracts category and amount from English statement", async () => {
  const result = await extractAssistanceRequest({
    transcript: "I urgently need 15000 rupees to buy wheat seeds for the upcoming season.",
    language: "en",
    forceMock: true,
  });

  assert.equal(result.category, "seeds");
  assert.equal(result.amountRequested, 15000);
  assert.equal(result.urgency, "urgent");
  assert.equal(result.isComplete, true);
  assert.equal(result.missingFields.length, 0);
  assert.equal(result.mode, "mock");
});

test("requestExtractor extracts details from Hindi statement with Devanagari numerals", async () => {
  const result = await extractAssistanceRequest({
    transcript: "मुझे फसल के लिए खाद खरीदने के लिए २०००० रुपये की आवश्यकता है।",
    language: "hi",
    forceMock: true,
  });

  assert.equal(result.category, "fertilizer");
  assert.equal(result.amountRequested, 20000);
  assert.equal(result.isComplete, true);
});

test("requestExtractor extracts details from Marathi statement", async () => {
  const result = await extractAssistanceRequest({
    transcript: "शेतात ठिबक सिंचन बसवण्यासाठी तातडीने २५००० रुपये मदत हवी आहे.",
    language: "mr",
    forceMock: true,
  });

  assert.equal(result.category, "irrigation");
  assert.equal(result.amountRequested, 25000);
  assert.equal(result.urgency, "urgent");
  assert.equal(result.isComplete, true);
});

test("requestExtractor detects missing fields and asks follow up question in farmer language", async () => {
  // Statement only mentions seeds, but no amount
  const result = await extractAssistanceRequest({
    transcript: "मला सोयाबीनचे बियाणे घ्यायचे आहे.",
    language: "mr",
    forceMock: true,
  });

  assert.equal(result.category, "seeds");
  assert.equal(result.amountRequested, null);
  assert.equal(result.isComplete, false);
  assert.ok(result.missingFields.includes("amountRequested"));
  assert.match(result.followUpQuestion, /रुपयांच्या/); // Marathi question for amount
});
