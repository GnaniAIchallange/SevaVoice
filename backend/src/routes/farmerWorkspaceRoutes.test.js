import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/sevavoice-test";
process.env.JWT_SECRET ??= "test-secret-at-least-thirty-two-characters";

const { createFarmerWorkspaceRouter } = await import("./farmerWorkspaceRoutes.js");

function generateToken(userId, role = "farmer") {
  return jwt.sign({ role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: "1h",
  });
}

function mockWorkspaceModels({ userOverrides = {}, docOverrides = [], reqOverrides = [] } = {}) {
  const user = {
    _id: "farmer-1",
    id: "farmer-1",
    name: "Tukaram Shinde",
    phone: "9876543210",
    role: "farmer",
    preferredLanguage: "mr",
    village: "Baramati",
    district: "Pune",
    state: "Maharashtra",
    landSizeAcres: 3,
    cropType: "Sugarcane",
    farmerVerificationStatus: "pending",
    verificationStatus: "pending",
    save: async () => user,
    ...userOverrides,
  };

  const documents = docOverrides.length > 0 ? [...docOverrides] : [
    {
      _id: "doc-1",
      id: "doc-1",
      ownerId: "farmer-1",
      type: "aadhaar",
      storageKey: "super-secret-key-123.pdf",
      mimeType: "application/pdf",
      size: 1024,
      verificationStatus: "verified",
      replacedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function() { return this; },
    },
    {
      _id: "doc-2",
      id: "doc-2",
      ownerId: "farmer-1",
      type: "land_certificate",
      storageKey: "secret-land-record-456.pdf",
      mimeType: "application/pdf",
      size: 2048,
      verificationStatus: "rejected",
      rejectionReason: "Blurry scan. Please re-upload.",
      replacedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function() { return this; },
    },
  ];

  const requests = [...reqOverrides];
  const donations = [
    { _id: "don-1", requestId: "req-1", amount: 1000, donorId: "donor-99" },
    { _id: "don-2", requestId: "req-1", amount: 2000, donorId: "donor-88" },
  ];

  return {
    user,
    documents,
    requests,
    donations,
    UserModel: {
      async findById(id) {
        return id === user._id ? user : null;
      },
      async updateOne(filter, update) {
        if (update.$set) {
          Object.assign(user, update.$set);
        }
      },
    },
    DocumentModel: {
      find(query) {
        const filtered = documents.filter((d) => d.ownerId === query.ownerId && (!query.replacedBy || d.replacedBy === query.replacedBy));
        return {
          sort() {
            return Promise.resolve(filtered);
          },
          then(resolve, reject) {
            return Promise.resolve(filtered).then(resolve, reject);
          },
        };
      },
      async findOne(query) {
        return documents.find((d) => d._id === query._id && d.ownerId === query.ownerId) || null;
      },
    },
    AssistanceRequestModel: {
      find(query) {
        const filtered = requests.filter((r) => r.farmerId === query.farmerId && (!query.status || r.status === query.status));
        return {
          sort() {
            return {
              limit(count) {
                return Promise.resolve(filtered.slice(0, count));
              },
              then(resolve, reject) {
                return Promise.resolve(filtered).then(resolve, reject);
              },
            };
          },
          then(resolve, reject) {
            return Promise.resolve(filtered).then(resolve, reject);
          },
        };
      },
      findOne(query) {
        const found = requests.find((r) => {
          if (query._id && r._id !== query._id) return false;
          if (query.farmerId && r.farmerId !== query.farmerId) return false;
          if (query.status && r.status !== query.status) return false;
          return true;
        });
        const wrapped = found
          ? {
              ...found,
              save: async function() {
                Object.assign(found, this);
                return found;
              },
            }
          : null;
        return {
          sort() {
            return Promise.resolve(wrapped);
          },
          then(resolve, reject) {
            return Promise.resolve(wrapped).then(resolve, reject);
          },
        };
      },
      async create(data) {
        const created = {
          _id: `req-${requests.length + 1}`,
          amountFunded: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
          save: async function() {
            return this;
          },
        };
        requests.push(created);
        return created;
      },
    },
    DonationModel: {
      async countDocuments(query) {
        return donations.filter((d) => d.requestId === String(query.requestId)).length;
      },
    },
  };
}

async function withWorkspaceServer(models, testFn) {
  const app = express();
  app.use(express.json());
  app.use("/api/farmer", createFarmerWorkspaceRouter(models));

  const server = createServer(app);
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await testFn(baseUrl);
  } finally {
    await new Promise((res) => server.close(res));
  }
}

test("farmer dashboard rejects requests without bearer token", async () => {
  const models = mockWorkspaceModels();
  await withWorkspaceServer(models, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/dashboard`);
    assert.equal(res.status, 401);
  });
});

test("farmer dashboard rejects non-farmer roles", async () => {
  const models = mockWorkspaceModels();
  const token = generateToken("user-1", "donor");
  await withWorkspaceServer(models, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });
});

test("farmer dashboard returns sanitized documents without exposing storageKey or paths", async () => {
  const models = mockWorkspaceModels();
  const token = generateToken("farmer-1", "farmer");
  await withWorkspaceServer(models, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.farmer.name, "Tukaram Shinde");
    assert.equal(body.hasRejectedDocument, true);
    assert.equal(body.canRequestHelp, false);
    assert.match(body.cannotRequestReason, /rejected|re-upload/i);

    // Verify document secrecy
    assert.equal(body.documents.length, 2);
    for (const doc of body.documents) {
      assert.equal(doc.storageKey, undefined);
      assert.equal(doc.path, undefined);
      assert.ok(doc.type);
      assert.ok(doc.verificationStatus);
    }
  });
});

test("assistance request submission is strictly GATED by verification status", async () => {
  // 1. Pending verification farmer tries to submit -> REJECTED with 403
  const pendingModels = mockWorkspaceModels({
    userOverrides: { farmerVerificationStatus: "pending" },
  });
  const token = generateToken("farmer-1", "farmer");

  await withWorkspaceServer(pendingModels, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "seeds",
        amountRequested: 12000,
        purpose: "Seeds for rabi crop season",
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /verification required/i);
  });

  // 2. Verified farmer submits -> ACCEPTED with 201
  const verifiedModels = mockWorkspaceModels({
    userOverrides: { farmerVerificationStatus: "verified" },
  });

  await withWorkspaceServer(verifiedModels, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "seeds",
        amountRequested: 12000,
        purpose: "Seeds for rabi crop season",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.request.status, "submitted");
    assert.equal(body.request.amountRequested, 12000);
    assert.equal(body.request.category, "seeds");
  });
});

test("draft requests can be autosaved regardless of verification status", async () => {
  const models = mockWorkspaceModels({
    userOverrides: { farmerVerificationStatus: "pending" },
  });
  const token = generateToken("farmer-1", "farmer");

  await withWorkspaceServer(models, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/requests/draft`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "fertilizer",
        amountRequested: 8000,
        purpose: "DAP fertilizer for winter sowing",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.request.status, "draft");
    assert.equal(body.request.category, "fertilizer");
  });
});

test("request detail endpoint returns donor count and hides donor identities", async () => {
  const models = mockWorkspaceModels({
    reqOverrides: [
      {
        _id: "req-1",
        farmerId: "farmer-1",
        category: "seeds",
        amountRequested: 15000,
        amountFunded: 3000,
        purpose: "Wheat seeds",
        status: "approved",
      },
    ],
  });
  const token = generateToken("farmer-1", "farmer");

  await withWorkspaceServer(models, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/farmer/requests/req-1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.request.amountFunded, 3000);
    assert.equal(body.request.donorCount, 2);
    assert.equal(body.request.fundingPercentage, 20);
    // Ensure no donor details leaked
    assert.equal(body.request.donors, undefined);
    assert.equal(body.request.donorList, undefined);
  });
});
