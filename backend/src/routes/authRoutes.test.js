import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/sevavoice-test";
process.env.JWT_SECRET ??= "test-secret-at-least-thirty-two-characters";

const { createAuthRouter } = await import("./authRoutes.js");
const allowRequests = (_req, _res, next) => next();

async function withServer(UserModel, run, registrationLimiter = allowRequests) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth",
    createAuthRouter({ UserModel, registrationLimiter }),
  );
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

const donorPayload = {
  name: "Example Donor",
  phone: "9876543210",
  email: "donor@example.test",
  password: "safe-test-password",
  preferredLanguage: "en",
};

test("donor registration hashes passwords and returns only safe account fields", async () => {
  let savedUser;
  const UserModel = {
    async create(userData) {
      savedUser = { id: "user-1", isActive: true, ...userData };
      return savedUser;
    },
  };

  await withServer(UserModel, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register/donor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donorPayload),
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(savedUser.password, undefined);
    assert.notEqual(savedUser.passwordHash, donorPayload.password);
    assert.equal(await bcrypt.compare(donorPayload.password, savedUser.passwordHash), true);
    assert.equal(body.user.phone, donorPayload.phone);
    assert.equal(body.user.role, "donor");
    assert.equal(body.user.passwordHash, undefined);
    assert.equal(JSON.stringify(body).includes(savedUser.passwordHash), false);
  });
});

test("donor registration rejects invalid and unknown fields before writing", async () => {
  let writes = 0;
  const UserModel = {
    async create() {
      writes += 1;
      return {};
    },
  };

  await withServer(UserModel, async (baseUrl) => {
    for (const invalid of [
      { ...donorPayload, phone: "1234567890" },
      { ...donorPayload, email: "not-an-email" },
      { ...donorPayload, unexpected: true },
    ]) {
      const response = await fetch(`${baseUrl}/api/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalid),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        message: "Check the donor registration details",
      });
    }
  });

  assert.equal(writes, 0);
});

test("donor registration reports duplicates and hides database errors", async () => {
  await withServer(
    {
      async create() {
        const error = new Error("duplicate key details");
        error.code = 11000;
        throw error;
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donorPayload),
      });
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), {
        message: "This phone number or email is already registered",
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
      const response = await fetch(`${baseUrl}/api/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donorPayload),
      });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        message: "Unable to create donor account",
      });
    },
  );
});

test("donor registration endpoint rate limits requests", async () => {
  const UserModel = {
    async create(userData) {
      return { id: "user-1", isActive: true, ...userData };
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

  await withServer(UserModel, async (baseUrl) => {
    const request = () =>
      fetch(`${baseUrl}/api/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donorPayload),
      });

    assert.equal((await request()).status, 201);
    const limited = await request();
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), {
      message: "Too many registration attempts",
    });
  }, limiter);
});
