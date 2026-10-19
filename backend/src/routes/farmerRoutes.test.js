import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import rateLimit from "express-rate-limit";

const { createFarmerRouter } = await import("./farmerRoutes.js");
const allowRequests = (_req, _res, next) => next();

async function withServer(FarmerRegistrationModel, run, registrationLimiter = allowRequests) {
  const app = express();
  app.use(express.json());
  app.use("/api/farmers", createFarmerRouter({ FarmerRegistrationModel, registrationLimiter }));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

const farmerPayload = {
  fullName: "Fake Test Farmer",
  mobileNumber: "9876543210",
  village: "Test Village",
  district: "Test District",
  state: "Maharashtra",
  landSizeAcres: 1.5,
  cropType: "Wheat",
  preferredLanguage: "en-IN",
};

test("farmer registration stores a pending profile with timestamps", async () => {
  let savedFarmer;
  const FarmerRegistrationModel = {
    async create(data) {
      savedFarmer = {
        id: "farmer-1",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        ...data,
      };
      return savedFarmer;
    },
  };

  await withServer(FarmerRegistrationModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/farmers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(farmerPayload),
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(savedFarmer.verificationStatus, "pending");
    assert.equal(savedFarmer.userId, undefined);
    assert.equal(body.farmer.mobileNumber, farmerPayload.mobileNumber);
    assert.equal(body.farmer.verificationStatus, "pending");
    assert.equal(typeof body.farmer.createdAt, "string");
    assert.equal(typeof body.farmer.updatedAt, "string");
  });
});

test("farmer registration validates fields, types, acreage bounds and rejects extras", async () => {
  let writes = 0;
  const FarmerRegistrationModel = {
    async create() {
      writes += 1;
      return {};
    },
  };

  await withServer(FarmerRegistrationModel, async (baseUrl) => {
    for (const invalid of [
      { ...farmerPayload, mobileNumber: "1234567890" },
      { ...farmerPayload, landSizeAcres: 0 },
      { ...farmerPayload, landSizeAcres: 10001 },
      { ...farmerPayload, landSizeAcres: true },
      { ...farmerPayload, village: " ".repeat(101) },
      { ...farmerPayload, documentData: "must not be accepted" },
    ]) {
      const response = await fetch(`${baseUrl}/api/farmers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalid),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        message: "Check the farmer registration details",
      });
    }
  });

  assert.equal(writes, 0);
});

test("farmer registration maps duplicate and generic database failures", async () => {
  await withServer(
    {
      async create() {
        const error = new Error("duplicate key details");
        error.code = 11000;
        throw error;
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/farmers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(farmerPayload),
      });
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), {
        message: "This number is already registered",
      });
    },
  );

  await withServer(
    {
      async create() {
        throw new Error("private database detail");
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/farmers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(farmerPayload),
      });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        message: "Unable to save farmer registration",
      });
    },
  );
});

test("farmer registration endpoint rate limits requests", async () => {
  const FarmerRegistrationModel = {
    async create(data) {
      return { id: "farmer-1", ...data };
    },
  };
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 1,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ message: "Too many registration attempts" }),
  });

  await withServer(FarmerRegistrationModel, async (baseUrl) => {
    const request = () =>
      fetch(`${baseUrl}/api/farmers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(farmerPayload),
      });

    assert.equal((await request()).status, 201);
    const limited = await request();
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), {
      message: "Too many registration attempts",
    });
  }, limiter);
});
