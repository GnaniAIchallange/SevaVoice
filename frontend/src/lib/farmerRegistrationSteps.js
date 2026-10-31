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
    documentGuide:
      "आता आधार कार्ड आणि जमिनीचा मालकी दाखला अपलोड करा. तुम्हाला हवे असल्यास अतिरिक्त कागदपत्रेही जोडू शकता. कागदपत्रे फक्त निवडून अपलोड करा; ती बोलून सांगू नका.",
    documentListenPrompt:
      "तुम्हाला कागदपत्रांबद्दल काय मदत हवी आहे ते सांगा. मी आवश्यक कागदपत्रे पुन्हा सांगीन.",
    documentHeardPrefix: "तुम्ही सांगितले",
    documentListen: "मदत मागण्यासाठी बोला",
    documentStop: "ऐकणे थांबवा",
    documentListening: "ऐकत आहे...",
    retry: "मला उत्तर समजले नाही. कृपया पुन्हा सांगा किंवा टाइप करा.",
    confirmPrefix: "तुम्ही सांगितले",
    confirmation: {
      isCorrectPrompt: "हे बरोबर आहे का? कृपया हो किंवा नाही म्हणा.",
      confirmQuestionText: "हे उत्तर बरोबर आहे का?",
      listeningYesNo: "हो किंवा नाही ऐकत आहे...",
      confirmedNotice: "उत्तर पुष्टी झाले ✓",
      retryNotice: "ठीक आहे. आपण पुन्हा विचारत आहोत...",
      unclearNotice: "मला समजले नाही. कृपया होय किंवा नाही म्हणा.",
      yesLabel: "होय, बरोबर आहे",
      noLabel: "नाही, पुन्हा सांगा",
      hearAgain: "पुन्हा ऐका",
    },
    done: "तुमची माहिती जतन झाली आहे.",
    duplicatePhone: "हा मोबाईल क्रमांक आधीच नोंदणीकृत आहे.",
    invalidDetails: "कृपया माहिती तपासा आणि पुन्हा प्रयत्न करा.",
    saveFailed: "माहिती जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.",
    saving: "माहिती जतन होत आहे...",
    actions: {
      title: "शेतकरी नोंदणी",
      back: "मागे",
      voiceOn: "Voice On",
      voiceOff: "Voice Off",
      listen: "ऐका",
      speakAnswer: "तुमचे उत्तर बोला",
      stopRecording: "रेकॉर्डिंग थांबवा",
      startingMic: "मायक्रोफोन सुरू होत आहे",
      proceed: "पुढे चला",
      checkHeard: "आम्ही ऐकलेले उत्तर तपासा",
      speakAgain: "पुन्हा बोला",
      emptyTranscript: "आवाज ऐकू आला नाही. पुन्हा बोला किंवा उत्तर लिहा.",
      placeholder: "बोला किंवा उत्तर टाइप करा",
      permissionHint: "मायक्रोफोन वापरण्यासाठी परवानगी द्या.",
      micDenied: "मायक्रोफोनची परवानगी नाकारली. उत्तर टाइप करा.",
      micFallback: "आवाज इनपुट उपलब्ध नाही. उत्तर टाइप करा.",
      voiceFallback: "आवाज उपलब्ध नाही. तुम्ही उत्तर टाइप करू शकता.",
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
    documentGuide:
      "अब आधार कार्ड और भूमि स्वामित्व प्रमाणपत्र अपलोड करें। चाहें तो अतिरिक्त दस्तावेज़ भी जोड़ें। दस्तावेज़ चुनकर अपलोड करें; उनकी जानकारी बोलकर न बताएं।",
    documentListenPrompt:
      "दस्तावेज़ों के बारे में आपको किस मदद की ज़रूरत है, बताएं। मैं आवश्यक दस्तावेज़ फिर से बताऊँगा।",
    documentHeardPrefix: "आपने कहा",
    documentListen: "मदद के लिए बोलें",
    documentStop: "सुनना बंद करें",
    documentListening: "सुन रहा है...",
    retry: "मुझे जवाब समझ नहीं आया। कृपया फिर से बोलें या टाइप करें।",
    confirmPrefix: "आपने कहा",
    confirmation: {
      isCorrectPrompt: "क्या यह सही है? कृपया हाँ या नहीं कहें।",
      confirmQuestionText: "क्या यह उत्तर सही है?",
      listeningYesNo: "हाँ या नहीं सुन रहा है...",
      confirmedNotice: "उत्तर की पुष्टि हो गई ✓",
      retryNotice: "ठीक है। हम दोबारा पूछ रहे हैं...",
      unclearNotice: "मुझे समझ नहीं आया। कृपया हाँ या नहीं कहें।",
      yesLabel: "हाँ, सही है",
      noLabel: "नहीं, दोबारा बताएं",
      hearAgain: "दोबारा सुनें",
    },
    done: "आपकी जानकारी सहेज ली गई है।",
    duplicatePhone: "यह मोबाइल नंबर पहले से पंजीकृत है।",
    invalidDetails: "कृपया जानकारी जाँचकर फिर कोशिश करें।",
    saveFailed: "जानकारी सहेजी नहीं जा सकी। कृपया फिर कोशिश करें।",
    saving: "जानकारी सहेजी जा रही है...",
    actions: {
      title: "किसान पंजीकरण",
      back: "वापस",
      voiceOn: "Voice On",
      voiceOff: "Voice Off",
      listen: "सुनें",
      speakAnswer: "अपना जवाब बोलें",
      stopRecording: "रिकॉर्डिंग रोकें",
      startingMic: "माइक्रोफ़ोन शुरू हो रहा है",
      proceed: "आगे बढ़ें",
      checkHeard: "सुने हुए जवाब को जाँचें",
      speakAgain: "फिर से बोलें",
      emptyTranscript: "आवाज़ सुनाई नहीं दी। फिर बोलें या जवाब लिखें।",
      placeholder: "बोलें या जवाब लिखें",
      permissionHint: "माइक्रोफ़ोन की अनुमति दें।",
      micDenied: "माइक्रोफ़ोन की अनुमति नहीं मिली। जवाब लिखें।",
      micFallback: "आवाज़ इनपुट उपलब्ध नहीं है। जवाब लिखें।",
      voiceFallback: "आवाज़ उपलब्ध नहीं है। आप जवाब लिख सकते हैं।",
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
    documentGuide:
      "Now upload your Aadhaar card and land ownership certificate. You may also add supporting documents. Select and upload the files; do not speak document details aloud.",
    documentListenPrompt:
      "Tell me what help you need with the documents. I will repeat which documents are required.",
    documentHeardPrefix: "I heard",
    documentListen: "Speak for document help",
    documentStop: "Stop listening",
    documentListening: "Listening...",
    retry: "I could not understand that. Please say it again or type your answer.",
    confirmPrefix: "You said",
    confirmation: {
      isCorrectPrompt: "Is this correct? Please say Yes or No.",
      confirmQuestionText: "Is this answer correct?",
      listeningYesNo: "Listening for Yes or No...",
      confirmedNotice: "Answer confirmed ✓",
      retryNotice: "Okay, let's ask again...",
      unclearNotice: "I did not understand. Please say Yes or No.",
      yesLabel: "Yes, Correct",
      noLabel: "No, Try Again",
      hearAgain: "Hear Again",
    },
    done: "Your details are saved.",
    duplicatePhone: "This mobile number is already registered.",
    invalidDetails: "Check your details and try again.",
    saveFailed: "Your details could not be saved. Please try again.",
    saving: "Saving your details...",
    actions: {
      title: "Farmer registration",
      back: "Back",
      voiceOn: "Voice On",
      voiceOff: "Voice Off",
      listen: "Listen",
      speakAnswer: "Speak your answer",
      stopRecording: "Stop recording",
      startingMic: "Starting microphone",
      proceed: "Proceed",
      checkHeard: "Please check what we heard",
      speakAgain: "Speak again",
      emptyTranscript: "We couldn't hear that, please try again or type your answer.",
      placeholder: "Speak or type your answer",
      permissionHint: "Your phone may ask you to allow microphone access.",
      micDenied: "Microphone access was denied. Type your answer below instead.",
      micFallback: "Voice input is unavailable. Type your answer below instead.",
      voiceFallback: "Voice playback is unavailable. You can still type your answer.",
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

const VALIDATION_MESSAGES = {
  "mr-IN": {
    required: {
      visual: "हे उत्तर आवश्यक आहे.",
      spoken: "कृपया उत्तर द्या.",
    },
    phone_digits: {
      visual: "फक्त अंक वापरा. मोकळी जागा किंवा हायफन चालेल.",
      spoken: "कृपया मोबाईल क्रमांक फक्त अंकात सांगा.",
    },
    phone_short: {
      visual: "तुम्ही {digits} अंक दिले; मोबाईल क्रमांकासाठी १० अंक हवेत.",
      spoken: "मोबाईल क्रमांक दहा अंकांचा असावा.",
    },
    phone_long: {
      visual: "तुम्ही {digits} अंक दिले; {extra} अंक कमी करा.",
      spoken: "मोबाईल क्रमांक दहा अंकांचा असावा.",
    },
    phone_start: {
      visual: "क्रमांक ६, ७, ८ किंवा ९ ने सुरू झाला पाहिजे.",
      spoken: "क्रमांक सहा, सात, आठ किंवा नऊने सुरू करा.",
    },
    text_short: {
      visual: "किमान {min} अक्षरे लिहा.",
      spoken: "कृपया थोडे मोठे उत्तर द्या.",
    },
    text_long: {
      visual: "उत्तर १०० अक्षरांपेक्षा लांब असू शकत नाही.",
      spoken: "उत्तर थोडक्यात सांगा.",
    },
    acres_number: {
      visual: "एकरमधील जमीन संख्या म्हणून लिहा. दशांश चालतात.",
      spoken: "जमिनीचे क्षेत्रफळ संख्या म्हणून सांगा.",
    },
    acres_positive: {
      visual: "जमिनीचे क्षेत्रफळ शून्यापेक्षा जास्त असावे.",
      spoken: "जमिनीचे क्षेत्रफळ शून्यापेक्षा जास्त असावे.",
    },
    acres_max: {
      visual: "जमीन १०,००० एकरांपेक्षा जास्त असू शकत नाही.",
      spoken: "जमीन दहा हजार एकरांपेक्षा जास्त असू शकत नाही.",
    },
    duplicate: {
      visual: "हा मोबाईल क्रमांक आधीच नोंदणीकृत आहे.",
      spoken: "हा मोबाईल क्रमांक आधीच नोंदणीकृत आहे.",
    },
    server_invalid: {
      visual: "ही माहिती तपासा आणि पुन्हा प्रयत्न करा.",
      spoken: "कृपया माहिती तपासा.",
    },
  },
  "hi-IN": {
    required: {
      visual: "यह जवाब ज़रूरी है।",
      spoken: "कृपया जवाब दें।",
    },
    phone_digits: {
      visual: "सिर्फ अंक लिखें। खाली जगह या हाइफ़न ठीक है।",
      spoken: "मोबाइल नंबर सिर्फ अंकों में बताएं।",
    },
    phone_short: {
      visual: "आपने {digits} अंक लिखे; मोबाइल नंबर के लिए १० अंक चाहिए।",
      spoken: "मोबाइल नंबर दस अंकों का होना चाहिए।",
    },
    phone_long: {
      visual: "आपने {digits} अंक लिखे; {extra} अंक कम करें।",
      spoken: "मोबाइल नंबर दस अंकों का होना चाहिए।",
    },
    phone_start: {
      visual: "नंबर ६, ७, ८ या ९ से शुरू होना चाहिए।",
      spoken: "नंबर छह, सात, आठ या नौ से शुरू करें।",
    },
    text_short: {
      visual: "कम से कम {min} अक्षर लिखें।",
      spoken: "कृपया थोड़ा बड़ा जवाब दें।",
    },
    text_long: {
      visual: "जवाब १०० अक्षरों से बड़ा नहीं हो सकता।",
      spoken: "जवाब छोटा करके बताएं।",
    },
    acres_number: {
      visual: "जमीन का क्षेत्रफल एकड़ में संख्या के रूप में लिखें। दशमलव ठीक हैं।",
      spoken: "जमीन का क्षेत्रफल संख्या में बताएं।",
    },
    acres_positive: {
      visual: "जमीन का क्षेत्रफल शून्य से ज़्यादा होना चाहिए।",
      spoken: "जमीन का क्षेत्रफल शून्य से ज़्यादा होना चाहिए।",
    },
    acres_max: {
      visual: "जमीन १०,००० एकड़ से ज़्यादा नहीं हो सकती।",
      spoken: "जमीन दस हजार एकड़ से ज़्यादा नहीं हो सकती।",
    },
    duplicate: {
      visual: "यह मोबाइल नंबर पहले से पंजीकृत है।",
      spoken: "यह मोबाइल नंबर पहले से पंजीकृत है।",
    },
    server_invalid: {
      visual: "जानकारी जाँचकर फिर कोशिश करें।",
      spoken: "कृपया जानकारी जाँचें।",
    },
  },
  "en-IN": {
    required: {
      visual: "This answer is required.",
      spoken: "Please provide an answer.",
    },
    phone_digits: {
      visual: "Use digits only. Spaces or hyphens are okay.",
      spoken: "Please enter the mobile number using digits only.",
    },
    phone_short: {
      visual: "You entered {digits} digits; a mobile number needs 10.",
      spoken: "A mobile number needs ten digits.",
    },
    phone_long: {
      visual: "You entered {digits} digits; remove {extra}.",
      spoken: "A mobile number needs ten digits.",
    },
    phone_start: {
      visual: "The number must start with 6, 7, 8, or 9.",
      spoken: "Start the number with six, seven, eight, or nine.",
    },
    text_short: {
      visual: "Enter at least {min} characters.",
      spoken: "Please give a longer answer.",
    },
    text_long: {
      visual: "The answer cannot exceed 100 characters.",
      spoken: "Please make your answer shorter.",
    },
    acres_number: {
      visual: "Enter land in acres as a number. Decimals are allowed.",
      spoken: "Please say the land size as a number.",
    },
    acres_positive: {
      visual: "The land size must be greater than zero.",
      spoken: "The land size must be greater than zero.",
    },
    acres_max: {
      visual: "Land size cannot exceed 10,000 acres.",
      spoken: "Land size cannot exceed ten thousand acres.",
    },
    duplicate: {
      visual: "This number is already registered.",
      spoken: "This number is already registered.",
    },
    server_invalid: {
      visual: "Check this information and try again.",
      spoken: "Please check this information.",
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
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(input)) {
      return input;
    }
    return mapSpokenNumber(input).replace(/,/g, "");
  }

  return input;
}

function hasOnlyPhoneCharacters(value) {
  const input = normalizeDevanagariDigits(String(value ?? "").trim());
  if (/^\+?\d[\d\s-]*$/.test(input)) {
    return true;
  }
  if (input.startsWith("+")) {
    return false;
  }

  const tokens = input
    .toLocaleLowerCase()
    .match(/[\p{L}\p{M}\d]+/gu);
  if (!tokens?.length) {
    return false;
  }
  const punctuation = input.replace(/[\p{L}\p{M}\d\s,.\-!?।]/gu, "");
  return (
    !punctuation &&
    tokens.every((token) => /^\d+$/.test(token) || SPOKEN_DIGITS.has(token))
  );
}

export function phoneDigitCount(value) {
  return normalize("phone", value).length;
}

export function validateFarmerAnswer(field, value) {
  const input = String(value ?? "").trim();
  if (!input) {
    return "required";
  }

  if (field === "phone") {
    if (!hasOnlyPhoneCharacters(input)) {
      return "phone_digits";
    }

    const normalized = normalize(field, input);
    if (normalized.length < 10) {
      return "phone_short";
    }
    if (normalized.length > 10) {
      return "phone_long";
    }
    if (!/^[6-9]\d{9}$/.test(normalized)) {
      return "phone_start";
    }
    return null;
  }

  if (field === "acres") {
    const normalized = normalize(field, input);
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      return "acres_number";
    }
    const acres = Number(normalized);
    if (!Number.isFinite(acres)) {
      return "acres_number";
    }
    if (acres <= 0) {
      return "acres_positive";
    }
    if (acres > 10000) {
      return "acres_max";
    }
    return null;
  }

  const normalized = normalize(field, input);
  const minimumLength = field === "name" ? 2 : 1;
  if (normalized.length < minimumLength) {
    return "text_short";
  }
  if (normalized.length > 100) {
    return "text_long";
  }

  return null;
}

export function getFarmerValidationMessage(code, language, { digits, min } = {}) {
  const message = VALIDATION_MESSAGES[language]?.[code];
  if (!message) {
    return null;
  }

  const extra = typeof digits === "number" ? Math.max(0, digits - 10) : "";
  const replacements = { digits, extra, min };
  const interpolate = (text) =>
    text.replace(/\{(\w+)\}/g, (_match, key) => String(replacements[key] ?? ""));

  return {
    visual: interpolate(message.visual),
    spoken: message.spoken,
  };
}

export function getFarmerValidationCodes() {
  return Object.keys(VALIDATION_MESSAGES["en-IN"]);
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

export function parseConfirmationResponse(transcript, language = "en-IN") {
  if (!transcript || typeof transcript !== "string") return null;
  const cleaned = transcript
    .toLowerCase()
    .trim()
    .replace(/[.,?!:;।\-]/g, " ")
    .replace(/\s+/g, " ");

  const NO_PATTERNS = [
    /\b(नाही|नाही नाही|चूक|चुकीचे|नाही चूक|बदला|नाही बदला|नको)\b/i,
    /\b(नहीं|ना|गलत|गलत है|नहीं नहीं|बदलो|नहीं जी|मत|नाजी)\b/i,
    /\b(no|nope|wrong|incorrect|not right|change|nahi|nahin|galat|chuk)\b/i,
  ];

  const YES_PATTERNS = [
    /\b(हो|होय|बरोबर|बरोबर आहे|हो बरोबर|होय बरोबर|नक्की|चालतंय|होय हो|हो हो|खरे|सत्य|योग्य)\b/i,
    /\b(हाँ|हाँ जी|हां|हाँ ठीक है|सही|सही है|हाँ सही|बिलकुल|ठीक है|जी हाँ|जी हां|अवश्य|हाँजी)\b/i,
    /\b(yes|yeah|yep|yup|correct|right|sure|ok|okay|ha|haa|haan|sahi|barobar|theek)\b/i,
  ];

  for (const pattern of NO_PATTERNS) {
    if (pattern.test(cleaned)) {
      return "no";
    }
  }

  for (const pattern of YES_PATTERNS) {
    if (pattern.test(cleaned)) {
      return "yes";
    }
  }

  return null;
}
