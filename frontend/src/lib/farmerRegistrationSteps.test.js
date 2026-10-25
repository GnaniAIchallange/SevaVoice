import assert from "node:assert/strict";
import test from "node:test";
import {
  getFarmerValidationCodes,
  getFarmerValidationMessage,
  normalize,
  phoneDigitCount,
  validateFarmerAnswer,
} from "./farmerRegistrationSteps.js";

test("normalizes Indian phone formats and spoken digits", () => {
  assert.equal(normalize("phone", "9876543210"), "9876543210");
  assert.equal(normalize("phone", "+91 98765-43210"), "9876543210");
  assert.equal(normalize("phone", "91 9876543210"), "9876543210");
  assert.equal(normalize("phone", "09876543210"), "9876543210");
  assert.equal(
    normalize("phone", "नौ आठ सात छह पाँच चार तीन दो एक शून्य"),
    "9876543210",
  );
  assert.equal(normalize("phone", "९८७६५४३२१०"), "9876543210");
  assert.equal(phoneDigitCount("+91 98765 43210"), 10);
});

test("phone validation returns distinct stable codes for server rules", () => {
  assert.equal(validateFarmerAnswer("phone", ""), "required");
  assert.equal(validateFarmerAnswer("phone", "letters987654"), "phone_digits");
  assert.equal(validateFarmerAnswer("phone", "98765432"), "phone_short");
  assert.equal(validateFarmerAnswer("phone", "98765432101"), "phone_long");
  assert.equal(validateFarmerAnswer("phone", "5123456789"), "phone_start");
  assert.equal(validateFarmerAnswer("phone", "98765-43210"), null);
  assert.equal(
    validateFarmerAnswer(
      "phone",
      "nine eight seven six five four three two one zero",
    ),
    null,
  );
});

test("acre validation matches the backend number format and bounds", () => {
  assert.equal(validateFarmerAnswer("acres", ""), "required");
  assert.equal(validateFarmerAnswer("acres", "many"), "acres_number");
  assert.equal(validateFarmerAnswer("acres", "1e2"), "acres_number");
  assert.equal(validateFarmerAnswer("acres", "-1"), "acres_positive");
  assert.equal(validateFarmerAnswer("acres", "0"), "acres_positive");
  assert.equal(validateFarmerAnswer("acres", "10000.1"), "acres_max");
  assert.equal(validateFarmerAnswer("acres", "10000"), null);
  assert.equal(validateFarmerAnswer("acres", ".5"), null);
  assert.equal(validateFarmerAnswer("acres", "2."), null);
  assert.equal(normalize("acres", "one point five"), "1.5");
  assert.equal(normalize("acres", "एक दशमलव पाँच।"), "1.5");
});

test("text fields use backend required, length, and trimming rules", () => {
  assert.equal(validateFarmerAnswer("name", " "), "required");
  assert.equal(validateFarmerAnswer("name", "A"), "text_short");
  assert.equal(validateFarmerAnswer("name", " AB "), null);
  assert.equal(validateFarmerAnswer("village", " "), "required");
  assert.equal(validateFarmerAnswer("village", "x"), null);
  assert.equal(validateFarmerAnswer("crop", "W".repeat(101)), "text_long");
  assert.equal(validateFarmerAnswer("district", "123"), null);
  assert.equal(validateFarmerAnswer("state", "!!!"), null);
});

test("every validation code has visual and spoken copy in all supported languages", () => {
  for (const language of ["en-IN", "mr-IN", "hi-IN"]) {
    for (const code of getFarmerValidationCodes()) {
      const message = getFarmerValidationMessage(code, language, {
        digits: 11,
        min: 2,
      });
      assert.ok(message?.visual, `${language}/${code} visual copy exists`);
      assert.ok(message?.spoken, `${language}/${code} spoken copy exists`);
      assert.ok(!message.visual.includes("{"), `${language}/${code} interpolated`);
    }
  }

  assert.match(
    getFarmerValidationMessage("phone_short", "en-IN", { digits: 8 }).visual,
    /8 digits.*10/,
  );
  assert.match(
    getFarmerValidationMessage("phone_long", "en-IN", { digits: 11 }).visual,
    /remove 1/,
  );
});
