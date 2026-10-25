import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import express from "express";
import rateLimit from "express-rate-limit";

const { createFarmerRouter } = await import("./farmerRoutes.js");
const allowRequests = (_req, _res, next) => next();
const farmerPayload = {
  fullName: "Fake Test Farmer",
  mobileNumber: "9876543210",
  village: "Test Village",
  district: "Test District",
  state: "Maharashtra",
  landSizeAcres: "1.5",
  cropType: "Wheat",
  preferredLanguage: "en-IN",
  password: "safe-test-password",
  farmerRegistrationKey: "8b7a5187-4c5e-43df-9178-836d8cc129b1",
};
const voiceRegistrationPayload = {
  fullName: "Voice Test Farmer",
  mobileNumber: "9876543211",
  village: "Voice Village",
  district: "Voice District",
  state: "Maharashtra",
  landSizeAcres: 1.5,
  cropType: "Wheat",
  preferredLanguage: "mr-IN",
};

function createModels({ userCreate, documentCreate } = {}) {
  const savedUser = {
    _id: "user-1",
    id: "user-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
  const documents = [];
  return {
    savedUser,
    documents,
    UserModel: {
      async findOne(query) {
        return savedUser.farmerRegistrationKey === query.farmerRegistrationKey
          ? savedUser
          : null;
      },
      async create(data) {
        if (userCreate) {
          return userCreate(data);
        }
        Object.assign(savedUser, data);
        return savedUser;
      },
      async updateOne(_filter, update) {
        savedUser.documents = update.$set.documents;
      },
      async deleteOne() {},
    },
    DocumentModel: {
      async create(data) {
        if (documentCreate) {
          return documentCreate(data);
        }
        const document = { _id: `document-${documents.length + 1}`, ...data };
        documents.push(document);
        return document;
      },
      async deleteMany() {
        documents.length = 0;
      },
    },
  };
}

async function withServer(models, run, registrationLimiter = allowRequests) {
  const storageDirectory = await mkdtemp(path.join(os.tmpdir(), "sevavoice-docs-"));
  const app = express();
  app.use(express.json());
  app.use(
    "/api/farmers",
    createFarmerRouter({
      ...models,
      registrationLimiter,
      storageDirectory,
    }),
  );
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(storageDirectory, { recursive: true, force: true });
  }
}

function registrationForm({
  overrides = {},
  aadhaar = new Blob(["%PDF-1.4\nidentity test"], { type: "application/pdf" }),
  land = new Blob(["%PDF-1.4\nland test"], { type: "application/pdf" }),
  supporting = [],
} = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...farmerPayload, ...overrides })) {
    form.append(key, value);
  }
  if (aadhaar) {
    form.append("aadhaarDocument", aadhaar, "aadhaar.pdf");
  }
  if (land) {
    form.append("landDocument", land, "land.pdf");
  }
  for (const file of supporting) {
    form.append("supportingDocuments", file, "supporting.pdf");
  }
  return form;
}

async function postRegistration(baseUrl, form = registrationForm()) {
  return fetch(`${baseUrl}/api/farmers/register`, {
    method: "POST",
    headers: { "Idempotency-Key": farmerPayload.farmerRegistrationKey },
    body: form,
  });
}

async function postVoiceRegistration(baseUrl, payload = voiceRegistrationPayload) {
  return fetch(`${baseUrl}/api/farmers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

test("farmer registration accepts the original voice-only JSON payload", async () => {
  let savedRegistration;
  const registrationTime = new Date("2026-01-01T00:00:00Z");
  await withServer(
    {
      FarmerRegistrationModel: {
        async create(data) {
          savedRegistration = {
            id: "registration-1",
            ...data,
            createdAt: registrationTime,
            updatedAt: registrationTime,
          };
          return savedRegistration;
        },
      },
    },
    async (baseUrl) => {
      const response = await postVoiceRegistration(baseUrl);
      const body = await response.json();

      assert.equal(response.status, 201);
      assert.deepEqual(savedRegistration, {
        id: "registration-1",
        ...voiceRegistrationPayload,
        verificationStatus: "pending",
        createdAt: registrationTime,
        updatedAt: registrationTime,
      });
      assert.deepEqual(body.farmer, {
        id: "registration-1",
        ...voiceRegistrationPayload,
        verificationStatus: "pending",
        createdAt: registrationTime.toISOString(),
        updatedAt: registrationTime.toISOString(),
      });
    },
  );
});

test("farmer registration stores user and document metadata with pending verification", async () => {
  const models = createModels();
  await withServer(models, async (baseUrl) => {
    const response = await postRegistration(baseUrl, registrationForm({
      supporting: [new Blob(["%PDF-1.4\nextra"], { type: "application/pdf" })],
    }));
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(models.savedUser.role, "farmer");
    assert.equal(models.savedUser.phone, farmerPayload.mobileNumber);
    assert.equal(models.savedUser.preferredLanguage, "en");
    assert.equal(models.savedUser.verificationStatus, "pending");
    assert.equal(models.savedUser.farmerVerificationStatus, "pending");
    assert.equal(models.savedUser.userId, undefined);
    assert.deepEqual(models.documents.map(({ type }) => type), [
      "aadhaar",
      "land_certificate",
      "supporting",
    ]);
    assert.ok(models.documents.every((document) => document.ownerId === "user-1"));
    assert.ok(models.documents.every((document) => document.storageKey.endsWith(".pdf")));
    assert.equal(models.savedUser.documents.length, 3);
    assert.equal(body.farmer.mobileNumber, farmerPayload.mobileNumber);
    assert.equal(body.farmer.verificationStatus, "pending");
    assert.match(body.message, /awaiting verification/);
  });
});

test("farmer registration requires both documents and rejects forged file types", async () => {
  const models = createModels();
  await withServer(models, async (baseUrl) => {
    const missingDocument = await postRegistration(
      baseUrl,
      registrationForm({ aadhaar: null }),
    );
    assert.equal(missingDocument.status, 400);
    assert.deepEqual(await missingDocument.json(), {
      message: "Upload both the Aadhaar card and land ownership certificate",
    });

    const forgedDocument = await postRegistration(
      baseUrl,
      registrationForm({
        aadhaar: new Blob(["not a PDF"], { type: "application/pdf" }),
      }),
    );
    assert.equal(forgedDocument.status, 400);
    assert.deepEqual(await forgedDocument.json(), {
      message: "A document does not match its file type",
    });
  });
  assert.equal(models.documents.length, 0);
});

test("retries with the same registration key do not create duplicate users or documents", async () => {
  const models = createModels();
  await withServer(models, async (baseUrl) => {
    assert.equal((await postRegistration(baseUrl)).status, 201);
    const retry = await postRegistration(baseUrl);
    assert.equal(retry.status, 200);
    assert.equal(models.savedUser.role, "farmer");
    assert.equal(models.documents.length, 2);
  });
});

test("farmer registration validates fields and does not create partial user accounts", async () => {
  let writes = 0;
  const models = createModels({
    userCreate: async (data) => {
      writes += 1;
      return data;
    },
  });

  await withServer(models, async (baseUrl) => {
    const invalid = await postRegistration(
      baseUrl,
      registrationForm({ overrides: { mobileNumber: "1234567890" } }),
    );
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
      message: "Check the farmer registration details",
    });

    const unexpected = await postRegistration(
      baseUrl,
      registrationForm({ overrides: { unexpected: "not accepted" } }),
    );
    assert.equal(unexpected.status, 400);
  });

  assert.equal(writes, 0);
});

test("farmer registration maps duplicate and database failures", async () => {
  const duplicateModels = createModels({
    userCreate: async () => {
      const error = new Error("duplicate key details");
      error.code = 11000;
      throw error;
    },
  });
  await withServer(duplicateModels, async (baseUrl) => {
    const response = await postRegistration(baseUrl);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      message: "This number or email is already registered",
    });
  });

  const failedDocumentModels = createModels({
    documentCreate: async () => {
      throw new Error("private database detail");
    },
  });
  await withServer(failedDocumentModels, async (baseUrl) => {
    const response = await postRegistration(baseUrl);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "Unable to save farmer registration and documents",
    });
  });
});

test("farmer registration endpoint rate limits requests", async () => {
  const models = createModels();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 1,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ message: "Too many registration attempts" }),
  });

  await withServer(models, async (baseUrl) => {
    assert.equal((await postRegistration(baseUrl)).status, 201);
    const limited = await postRegistration(baseUrl);
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), {
      message: "Too many registration attempts",
    });
  }, limiter);
});
