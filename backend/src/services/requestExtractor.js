/**
 * Request Extractor Service
 *
 * Extracts structured fields from voice/text transcripts for farmer assistance requests.
 * Runs in MOCK mode when no LLM API key is configured or when MOCK mode is requested.
 * NEVER makes external LLM calls unless a real API key is present.
 */

import { REQUEST_CATEGORIES } from "../utils/constants.js";

// Multilingual follow-up prompt templates for missing fields
const FOLLOW_UP_QUESTIONS = {
  en: {
    category: "What kind of assistance do you need? For example: seeds, fertilizer, equipment, irrigation, or medical support.",
    amountRequested: "How much financial assistance (in Rupees) do you need?",
    purpose: "Please briefly describe what you need this assistance for and for which crop or season.",
  },
  hi: {
    category: "आपको किस प्रकार की सहायता चाहिए? जैसे: बीज, खाद, कृषि उपकरण, सिंचाई, या चिकित्सा सहायता।",
    amountRequested: "आपको कितने रुपये की आर्थिक सहायता की आवश्यकता है?",
    purpose: "कृपया संक्षेप में बताएं कि आपको यह सहायता किस कार्य या फसल के लिए चाहिए।",
  },
  mr: {
    category: "तुम्हाला कोणत्या प्रकारची मदत हवी आहे? जसे: बियाणे, खते, कृषी अवजारे, सिंचन, किंवा वैद्यकीय मदत.",
    amountRequested: "तुम्हाला किती रुपयांच्या आर्थिक मदतीची आवश्यकता आहे?",
    purpose: "कृपया थोडक्यात सांगा की तुम्हाला ही मदत कशासाठी आणि कोणत्या पिकासाठी हवी आहे.",
  },
};

// Keyword dictionary for mapping spoken terms to category in English, Hindi, and Marathi
const CATEGORY_KEYWORDS = {
  seeds: [
    "seed", "seeds", "sowing", "grain", "wheat seed", "rice seed", "cotton seed", "soybean",
    "बीज", "बियाणे", "पेरणी", "बियाण्यांसाठी", "बिया", "बियाणं", "सोयाबीन", "गहू", "धान", "तांदूळ", "कपास"
  ],
  fertilizer: [
    "fertilizer", "fertilizers", "urea", "dap", "manure", "pesticide", "spray", "compost",
    "खाद", "उर्वरक", "यूरिया", "डीएपी", "कीटनाशक", "खत", "खते", "युरिया", "औषध", "फवारणी", "शेणखत"
  ],
  equipment: [
    "equipment", "tool", "tools", "tractor", "plow", "harvester", "tiller", "machinery",
    "उपकरण", "ट्रैक्टर", "यंत्र", "हल", "मशीन", "अवजार", "अवजारे", "ट्रॅक्टर", "नांगर", "यंत्रसामग्री"
  ],
  irrigation: [
    "irrigation", "water", "pipe", "pump", "borewell", "drip", "sprinkler", "motor", "well",
    "सिंचाई", "पानी", "पंप", "पाइप", "बोरवेल", "ड्रिप", "मोटर", "कुआं", "सिंचन", "पाणी", "पाईप", "ठिबक", "तुषार", "विहीर"
  ],
  livestock: [
    "cow", "buffalo", "cattle", "bull", "goat", "poultry", "dairy", "animal", "fodder",
    "गाय", "भैंस", "बैल", "बकरी", "पशु", "चारा", "दुग्ध", "पशू", "म्हैस", "शेळी", "कुक्कुटपालन"
  ],
  medical: [
    "medical", "health", "hospital", "doctor", "medicine", "treatment", "illness",
    "चिकित्सा", "दवा", "इलाज", "अस्पताल", "बीमारी", "आरोग्य", "औषधोपचार", "दवाखाना", "आजार"
  ],
  other: ["other", "help", "assistance", "अन्य", "इतर", "मदत"],
};

// Urgency keywords
const URGENT_KEYWORDS = [
  "urgent", "emergency", "immediately", "asap", "critical",
  "जरूरी", "तत्काल", "आपातकालीन", "जल्द से जल्द",
  "तातडीचे", "तातडीची", "त्वरित", "लवकरात लवकर", "तातडीने"
];

/**
 * Extracts a numeric rupee amount from text, handling both Arabic and Devanagari numerals,
 * as well as spoken number words in English/Hindi/Marathi.
 */
function extractAmount(text) {
  if (!text) return null;

  // Convert Devanagari digits to standard digits
  const devanagariDigits = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  const normalizedText = text.replace(/[०-९]/g, (digit) => devanagariDigits[digit] ?? digit);

  // Look for currency symbols or digits: e.g. "₹15000", "15,000 rs", "रु 25000", "50000 रुपये"
  const rupeePattern = /(?:₹|rs\.?|inr|रुपये|रुपया|रुपये|रु\.?)\s*(\d[\d,]*)/i;
  const rupeeMatch = normalizedText.match(rupeePattern);
  if (rupeeMatch) {
    const parsed = parseInt(rupeeMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Look for number with rupees following: e.g. "15000 rupees", "15000 रुपये"
  const numberThenRupeePattern = /(\d[\d,]*)\s*(?:₹|rs\.?|inr|rupees|rupee|रुपये|रुपया|रुपये|रु\.?|हजार|लाख|thousand|lakh)/i;
  const numRupeeMatch = normalizedText.match(numberThenRupeePattern);
  if (numRupeeMatch) {
    let base = parseInt(numRupeeMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(base) && base > 0) {
      if (/हजार|thousand/i.test(numRupeeMatch[0]) && base < 1000) base *= 1000;
      if (/लाख|lakh/i.test(numRupeeMatch[0]) && base < 100) base *= 100000;
      return base;
    }
  }

  // Look for any standalone number in thousands: 500 to 10,000,000
  const anyNumberPattern = /\b(\d[\d,]{2,})\b/g;
  let match;
  while ((match = anyNumberPattern.exec(normalizedText)) !== null) {
    const val = parseInt(match[1].replace(/,/g, ""), 10);
    if (!isNaN(val) && val >= 500 && val <= 10000000) {
      return val;
    }
  }

  // Spoken text matching for common Hindi / Marathi phrases (e.g. "दस हजार", "दहा हजार", "पंधरा हजार")
  const wordAmounts = [
    { regex: /(?:दहा हजार|दस हजार|ten thousand)/i, value: 10000 },
    { regex: /(?:पंधरा हजार|पंद्रह हजार|fifteen thousand)/i, value: 15000 },
    { regex: /(?:वीस हजार|बीस हजार|twenty thousand)/i, value: 20000 },
    { regex: /(?:पंचवीस हजार|पच्चीस हजार|twenty five thousand)/i, value: 25000 },
    { regex: /(?:तीस हजार|thirty thousand)/i, value: 30000 },
    { regex: /(?:चाळीस हजार|चालीस हजार|forty thousand)/i, value: 40000 },
    { regex: /(?:पन्नास हजार|पचास हजार|fifty thousand)/i, value: 50000 },
    { regex: /(?:एक लाख|one lakh)/i, value: 100000 },
  ];
  for (const { regex, value } of wordAmounts) {
    if (regex.test(normalizedText)) return value;
  }

  return null;
}

/**
 * Detects the category from text based on keyword matches.
 */
function extractCategory(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Detects urgency from text.
 */
function extractUrgency(text) {
  if (!text) return "standard";
  const lower = text.toLowerCase();
  for (const kw of URGENT_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return "urgent";
    }
  }
  return "standard";
}

/**
 * Generates or refines a plain language purpose statement.
 */
function extractPurpose(text, category, amount) {
  if (!text || text.trim().length === 0) return null;
  const trimmed = text.trim();
  if (trimmed.length >= 10) {
    return trimmed;
  }
  if (category) {
    return `Financial assistance for ${category}${amount ? ` (₹${amount})` : ""}`;
  }
  return trimmed;
}

/**
 * Main extractor function.
 *
 * @param {Object} params
 * @param {string} params.transcript Farmer's spoken or typed text
 * @param {string} [params.language='en'] Preferred language ('en', 'hi', 'mr')
 * @param {Object} [params.currentFields={}] Any fields already filled in previous turns
 * @param {boolean} [params.forceMock=false] Force mock extraction
 * @returns {Promise<{
 *   category: string|null,
 *   amountRequested: number|null,
 *   purpose: string|null,
 *   urgency: string,
 *   missingFields: string[],
 *   followUpQuestion: string|null,
 *   isComplete: boolean
 * }>}
 */
export async function extractAssistanceRequest({
  transcript = "",
  language = "en",
  currentFields = {},
  forceMock = false,
} = {}) {
  const normLang = language.startsWith("mr") ? "mr" : language.startsWith("hi") ? "hi" : "en";

  // Check if LLM API key exists. If not, or if forceMock is true, use the Mock Extractor.
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
  const isMockMode = forceMock || !apiKey.trim() || apiKey.includes("placeholder") || apiKey.includes("replace");

  let extracted;
  if (isMockMode) {
    extracted = mockExtract(transcript, currentFields);
  } else {
    // If real API key is configured, invoke real LLM
    try {
      extracted = await realLlmExtract(transcript, currentFields, apiKey, normLang);
    } catch (error) {
      console.warn("Real LLM extraction failed, falling back to mock heuristic extractor:", error.message);
      extracted = mockExtract(transcript, currentFields);
    }
  }

  // Merge with any pre-existing fields
  const finalCategory = currentFields.category || extracted.category || null;
  const finalAmount = currentFields.amountRequested || extracted.amountRequested || null;
  const finalPurpose = currentFields.purpose || extracted.purpose || null;
  const finalUrgency = currentFields.urgency || extracted.urgency || "standard";

  // Identify missing required fields
  const missingFields = [];
  if (!finalCategory || !REQUEST_CATEGORIES.includes(finalCategory)) {
    missingFields.push("category");
  }
  if (!finalAmount || typeof finalAmount !== "number" || finalAmount <= 0) {
    missingFields.push("amountRequested");
  }
  if (!finalPurpose || finalPurpose.trim().length < 5) {
    missingFields.push("purpose");
  }

  // Choose the next follow-up question if any field is missing
  let followUpQuestion = null;
  if (missingFields.length > 0) {
    const nextMissing = missingFields[0];
    followUpQuestion = FOLLOW_UP_QUESTIONS[normLang]?.[nextMissing] || FOLLOW_UP_QUESTIONS.en[nextMissing];
  }

  return {
    category: finalCategory,
    amountRequested: finalAmount,
    purpose: finalPurpose,
    urgency: finalUrgency,
    missingFields,
    followUpQuestion,
    isComplete: missingFields.length === 0,
    transcript: transcript.trim(),
    mode: isMockMode ? "mock" : "real",
  };
}

/**
 * Mock heuristic extraction based on NLP keyword and pattern rules.
 */
function mockExtract(transcript, currentFields = {}) {
  const text = transcript || "";
  const foundCategory = extractCategory(text);
  const foundAmount = extractAmount(text);
  const foundUrgency = extractUrgency(text);
  const foundPurpose = extractPurpose(text, foundCategory || currentFields.category, foundAmount || currentFields.amountRequested);

  return {
    category: foundCategory || currentFields.category || null,
    amountRequested: foundAmount || currentFields.amountRequested || null,
    purpose: foundPurpose || currentFields.purpose || null,
    urgency: foundUrgency || currentFields.urgency || "standard",
  };
}

/**
 * Real LLM extraction using Gemini API (if key present).
 */
async function realLlmExtract(transcript, currentFields, apiKey, language) {
  const prompt = `You are an AI assistant for SevaVoice, an Indian farmer assistance platform.
Extract structured details from the following farmer's statement.
Do NOT judge eligibility. Extract only what is stated.

Farmer statement: "${transcript}"
Current fields: ${JSON.stringify(currentFields)}

Valid categories: ${REQUEST_CATEGORIES.join(", ")}
Language: ${language}

Respond strictly with a JSON object with these keys:
{
  "category": "one of valid categories, or null if unknown",
  "amountRequested": integer number in Rupees or null if not stated,
  "purpose": "concise description of why the farmer needs this assistance",
  "urgency": "urgent" or "standard"
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const result = await response.json();
  const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error("Empty Gemini response");

  return JSON.parse(textContent);
}
