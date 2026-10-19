export const FARMER_REGISTRATION_FIELDS = [
  "name",
  "phone",
  "village",
  "district",
  "state",
  "acres",
  "crop",
];

export const FARMER_REGISTRATION_LANGUAGES = {
  "mr-IN": {
    name: "मराठी",
    intro: "सेवावॉइसमध्ये आपले स्वागत आहे. आपण एकेक प्रश्नाचे उत्तर देऊ शकता.",
    retry: "मला उत्तर समजले नाही. कृपया पुन्हा सांगा किंवा टाइप करा.",
    confirmPrefix: "तुम्ही सांगितले",
    confirmQuestion: "हे बरोबर आहे का?",
    invalidPhone: "कृपया दहा अंकी भारतीय मोबाईल क्रमांक सांगा.",
    invalidAcres: "कृपया एकरमधील जमीन संख्या म्हणून सांगा.",
    done: "तुमची माहिती जतन झाली आहे.",
    duplicatePhone: "हा मोबाईल क्रमांक आधीच नोंदणीकृत आहे.",
    invalidDetails: "कृपया माहिती तपासा आणि पुन्हा प्रयत्न करा.",
    saveFailed: "माहिती जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.",
    saving: "माहिती जतन होत आहे...",
    actions: {
      title: "शेतकरी नोंदणी",
      back: "मागे",
      replay: "प्रश्न पुन्हा ऐका",
      start: "बोलायला सुरुवात करा",
      stop: "ऐकणे थांबवा",
      requesting: "मायक्रोफोन सुरू होत आहे...",
      review: "माझे उत्तर तपासा",
      readAgain: "माझे उत्तर पुन्हा ऐका",
      yes: "✓ हो, बरोबर",
      no: "✕ नाही, पुन्हा प्रयत्न करा",
      placeholder: "बोला किंवा उत्तर टाइप करा",
      permissionHint: "मायक्रोफोन वापरण्यासाठी परवानगी द्या.",
      micDenied: "मायक्रोफोनची परवानगी नाकारली. उत्तर टाइप करा.",
      micFallback: "आवाज इनपुट उपलब्ध नाही. उत्तर टाइप करा.",
      voiceFallback: "आवाज उपलब्ध नाही. तुम्ही उत्तर टाइप करू शकता.",
      readbackFallback: "तुमचे उत्तर खाली तपासा. आवाज उपलब्ध नाही.",
      completeTitle: "माहिती पूर्ण",
      login: "लॉगिन पृष्ठावर जा",
    },
    steps: {
      name: { label: "पूर्ण नाव", prompt: "तुमचे पूर्ण नाव काय आहे?" },
      phone: {
        label: "मोबाईल क्रमांक",
        prompt: "तुमचा दहा अंकी मोबाईल क्रमांक सांगा.",
      },
      village: { label: "गाव", prompt: "तुमचे गाव कोणते?" },
      district: { label: "जिल्हा", prompt: "तुमचा जिल्हा कोणता?" },
      state: { label: "राज्य", prompt: "तुमचे राज्य कोणते?" },
      acres: {
        label: "जमीन (एकर)",
        prompt: "तुमच्याकडे किती एकर जमीन आहे?",
      },
      crop: { label: "मुख्य पीक", prompt: "तुमचे मुख्य पीक कोणते?" },
    },
  },
  "hi-IN": {
    name: "हिंदी",
    intro: "सेवावॉइस में आपका स्वागत है। आप एक-एक सवाल का जवाब दे सकते हैं।",
    retry: "मुझे जवाब समझ नहीं आया। कृपया फिर से बोलें या टाइप करें।",
    confirmPrefix: "आपने कहा",
    confirmQuestion: "क्या यह सही है?",
    invalidPhone: "कृपया दस अंकों का भारतीय मोबाइल नंबर बताएं।",
    invalidAcres: "कृपया जमीन एकड़ में संख्या के रूप में बताएं।",
    done: "आपकी जानकारी सहेज ली गई है।",
    duplicatePhone: "यह मोबाइल नंबर पहले से पंजीकृत है।",
    invalidDetails: "कृपया जानकारी जाँचकर फिर कोशिश करें।",
    saveFailed: "जानकारी सहेजी नहीं जा सकी। कृपया फिर कोशिश करें।",
    saving: "जानकारी सहेजी जा रही है...",
    actions: {
      title: "किसान पंजीकरण",
      back: "वापस",
      replay: "सवाल फिर सुनें",
      start: "बोलना शुरू करें",
      stop: "सुनना बंद करें",
      requesting: "माइक्रोफ़ोन शुरू हो रहा है...",
      review: "मेरा जवाब जाँचें",
      readAgain: "मेरा जवाब फिर सुनें",
      yes: "✓ हाँ, सही",
      no: "✕ नहीं, फिर कोशिश करें",
      placeholder: "बोलें या जवाब लिखें",
      permissionHint: "माइक्रोफ़ोन की अनुमति दें।",
      micDenied: "माइक्रोफ़ोन की अनुमति नहीं मिली। जवाब लिखें।",
      micFallback: "आवाज़ इनपुट उपलब्ध नहीं है। जवाब लिखें।",
      voiceFallback: "आवाज़ उपलब्ध नहीं है। आप जवाब लिख सकते हैं।",
      readbackFallback: "नीचे अपना जवाब देखें। आवाज़ उपलब्ध नहीं है।",
      completeTitle: "जानकारी पूरी हुई",
      login: "लॉगिन पृष्ठ पर जाएँ",
    },
    steps: {
      name: { label: "पूरा नाम", prompt: "आपका पूरा नाम क्या है?" },
      phone: {
        label: "मोबाइल नंबर",
        prompt: "अपना दस अंकों का मोबाइल नंबर बताइए।",
      },
      village: { label: "गाँव", prompt: "आपका गाँव कौन सा है?" },
      district: { label: "जिला", prompt: "आपका जिला कौन सा है?" },
      state: { label: "राज्य", prompt: "आपका राज्य कौन सा है?" },
      acres: {
        label: "जमीन (एकड़)",
        prompt: "आपके पास कितनी एकड़ जमीन है?",
      },
      crop: { label: "मुख्य फसल", prompt: "आपकी मुख्य फसल कौन सी है?" },
    },
  },
  "en-IN": {
    name: "English",
    intro: "Welcome to SevaVoice. I will ask one question at a time.",
    retry: "I could not understand that. Please say it again or type your answer.",
    confirmPrefix: "You said",
    confirmQuestion: "Is that correct?",
    invalidPhone: "Please provide a valid ten-digit Indian mobile number.",
    invalidAcres: "Please enter the land size in acres as a number.",
    done: "Your details are saved.",
    duplicatePhone: "This mobile number is already registered.",
    invalidDetails: "Check your details and try again.",
    saveFailed: "Your details could not be saved. Please try again.",
    saving: "Saving your details...",
    actions: {
      title: "Farmer registration",
      back: "Back",
      replay: "Replay question",
      start: "Start speaking",
      stop: "Stop listening",
      requesting: "Starting microphone...",
      review: "Review my answer",
      readAgain: "Read my answer again",
      yes: "✓ Yes, correct",
      no: "✕ No, try again",
      placeholder: "Speak or type your answer",
      permissionHint: "Your phone may ask you to allow microphone access.",
      micDenied: "Microphone access was denied. Type your answer below instead.",
      micFallback: "Voice input is unavailable. Type your answer below instead.",
      voiceFallback: "Voice playback is unavailable. You can still type your answer.",
      readbackFallback: "Review your answer below. Voice playback is unavailable.",
      completeTitle: "Details complete",
      login: "Go to login",
    },
    steps: {
      name: { label: "Full name", prompt: "What is your full name?" },
      phone: {
        label: "Mobile number",
        prompt: "Please say your ten-digit mobile number.",
      },
      village: { label: "Village", prompt: "What is your village?" },
      district: { label: "District", prompt: "What is your district?" },
      state: { label: "State", prompt: "What is your state?" },
      acres: {
        label: "Land in acres",
        prompt: "How many acres of land do you have?",
      },
      crop: { label: "Main crop", prompt: "What is your main crop?" },
    },
  },
};

const SPOKEN_DIGITS = new Map([
  ["zero", "0"],
  ["oh", "0"],
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["nine", "9"],
  ["शून्य", "0"],
  ["एक", "1"],
  ["दोन", "2"],
  ["दो", "2"],
  ["तीन", "3"],
  ["चार", "4"],
  ["पाच", "5"],
  ["पाँच", "5"],
  ["पांच", "5"],
  ["सहा", "6"],
  ["छह", "6"],
  ["सात", "7"],
  ["आठ", "8"],
  ["नऊ", "9"],
  ["नौ", "9"],
]);

const SPOKEN_NUMBERS = new Map([
  ["zero", "0"],
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["nine", "9"],
  ["ten", "10"],
  ["शून्य", "0"],
  ["एक", "1"],
  ["दो", "2"],
  ["दोन", "2"],
  ["तीन", "3"],
  ["चार", "4"],
  ["पाँच", "5"],
  ["पांच", "5"],
  ["पाच", "5"],
  ["छह", "6"],
  ["सहा", "6"],
  ["सात", "7"],
  ["आठ", "8"],
  ["नौ", "9"],
  ["नऊ", "9"],
  ["दस", "10"],
  ["दहा", "10"],
]);

function mapDigitWords(value) {
  return value
    .trim()
    .toLocaleLowerCase()
    .split(/[\s,]+/)
    .map((word) => {
      const token = word.replace(/[^\p{L}\p{M}\d]/gu, "");
      return SPOKEN_DIGITS.get(token) ?? token;
    })
    .join("");
}

function mapSpokenNumber(value) {
  const words = value
    .trim()
    .toLocaleLowerCase()
    .split(/\s+(?:point|दशमलव|दशांश)\s+/);
  const whole = words[0]
    .split(/\s+/)
    .map((word) => {
      const token = word.replace(/[^\p{L}\p{M}\d]/gu, "");
      return SPOKEN_NUMBERS.get(token) ?? token;
    })
    .join("");

  if (words.length === 1) {
    return whole;
  }

  const fraction = words[1]
    .split(/\s+/)
    .map((word) => {
      const token = word.replace(/[^\p{L}\p{M}\d]/gu, "");
      return SPOKEN_DIGITS.get(token) ?? token;
    })
    .join("");
  return `${whole}.${fraction}`;
}

function normalizeDevanagariDigits(value) {
  return value.replace(/[०-९]/g, (digit) =>
    String(digit.charCodeAt(0) - "०".charCodeAt(0)),
  );
}

export function normalize(field, value) {
  const input = normalizeDevanagariDigits(String(value ?? "").trim());

  if (field === "phone") {
    let digits = mapDigitWords(input).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits;
  }

  if (field === "acres") {
    if (/^[+-]?\d+(?:\.\d+)?$/.test(input)) {
      return input;
    }
    return mapSpokenNumber(input).replace(/,/g, "");
  }

  return input;
}

export function validateFarmerAnswer(field, value) {
  const normalized = normalize(field, value);

  if (!normalized) {
    return "empty";
  }

  if (field === "phone" && !/^[6-9]\d{9}$/.test(normalized)) {
    return "phone";
  }

  if (
    field === "acres" &&
    (!Number.isFinite(Number(normalized)) ||
      Number(normalized) <= 0 ||
      Number(normalized) > 10000)
  ) {
    return "acres";
  }

  return null;
}

export function phoneReadback(value, language) {
  const digitWords = {
    "mr-IN": ["शून्य", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ"],
    "hi-IN": ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ"],
    "en-IN": ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  };

  return Array.from(normalize("phone", value))
    .map((digit) => digitWords[language][Number(digit)])
    .join(" ");
}
