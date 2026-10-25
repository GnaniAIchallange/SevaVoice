import assert from "node:assert/strict";
import test from "node:test";
import { getStrings, STRINGS } from "./farmerStrings.js";

test("getStrings returns complete dictionaries for English, Hindi, and Marathi", () => {
  for (const lang of ["en", "hi", "mr"]) {
    const s = getStrings(lang);
    assert.ok(s.nav.home);
    assert.ok(s.nav.requestHelp);
    assert.ok(s.nav.myRequests);
    assert.ok(s.nav.documents);
    assert.ok(s.nav.profile);

    assert.ok(s.dashboard.requestHelpButton);
    assert.ok(s.dashboard.greeting);

    assert.ok(s.verification.verifiedTitle);
    assert.ok(s.verification.pendingTitle);
    assert.ok(s.verification.rejectedTitle);

    assert.ok(s.newRequest.title);
    assert.ok(s.newRequest.confirmAndSubmit);
    assert.ok(s.newRequest.gatedTitle);

    assert.ok(s.requests.detailTitle);
    assert.ok(s.requests.targetAmount);

    assert.ok(s.documents.pageTitle);
    assert.ok(s.documents.reuploadBtn);

    assert.ok(s.profile.pageTitle);
    assert.ok(s.profile.warningModalTitle);
  }
});

test("getStrings normalizes dialect codes correctly", () => {
  assert.equal(getStrings("mr-IN"), STRINGS.mr);
  assert.equal(getStrings("hi-IN"), STRINGS.hi);
  assert.equal(getStrings("en-IN"), STRINGS.en);
  assert.equal(getStrings(null), STRINGS.en);
});
