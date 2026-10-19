import assert from "node:assert/strict";
import test from "node:test";
import { normalize, validateFarmerAnswer } from "./farmerRegistrationSteps.js";

test("normalizes and validates supported Indian mobile formats", () => {
  assert.equal(normalize("phone", "9876543210"), "9876543210");
  assert.equal(validateFarmerAnswer("phone", "9876543210"), null);

  assert.equal(normalize("phone", "987654321"), "987654321");
  assert.equal(validateFarmerAnswer("phone", "987654321"), "phone");

  assert.equal(normalize("phone", "98765432101"), "98765432101");
  assert.equal(validateFarmerAnswer("phone", "98765432101"), "phone");

  assert.equal(normalize("phone", "+91 98765 43210"), "9876543210");
  assert.equal(normalize("phone", "09876543210"), "9876543210");
});

test("normalizes spoken digit words and rejects empty phone answers", () => {
  assert.equal(
    normalize("phone", "nine eight seven six five four three two one zero"),
    "9876543210",
  );
  assert.equal(
    normalize("phone", "नौ आठ सात छह पाँच चार तीन दो एक शून्य"),
    "9876543210",
  );
  assert.equal(
    normalize("phone", "नौ, आठ सात छह पाँच चार तीन दो एक शून्य।"),
    "9876543210",
  );
  assert.equal(normalize("phone", "९८७६५४३२१०"), "9876543210");
  assert.equal(normalize("phone", ""), "");
  assert.equal(validateFarmerAnswer("phone", ""), "empty");
});

test("normalizes acres and requires a positive value within the registration limit", () => {
  assert.equal(normalize("acres", "1.5"), "1.5");
  assert.equal(normalize("acres", "one point five"), "1.5");
  assert.equal(normalize("acres", "एक दशमलव पाँच।"), "1.5");
  assert.equal(validateFarmerAnswer("acres", "1.5"), null);
  assert.equal(validateFarmerAnswer("acres", "0"), "acres");
  assert.equal(validateFarmerAnswer("acres", "10000.1"), "acres");
  assert.equal(validateFarmerAnswer("acres", "many"), "acres");
  assert.equal(validateFarmerAnswer("acres", "-1"), "acres");
  assert.equal(validateFarmerAnswer("acres", ""), "empty");
});
