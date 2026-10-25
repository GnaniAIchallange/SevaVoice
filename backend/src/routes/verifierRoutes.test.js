import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { DOCUMENT_STATUS, REQUEST_STATUS, ROLES, VERIFICATION_STATUS } from '../utils/constants.js';

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/sevavoice-test';
process.env.JWT_SECRET ??= 'test-secret-at-least-thirty-two-characters';

const { createVerifierRouter } = await import('./verifierRoutes.js');

function createToken(role = ROLES.VERIFIER, userId = new mongoose.Types.ObjectId().toString()) {
  return jwt.sign({ role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: '1h',
  });
}

async function withVerifierServer(models, run) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/verifier',
    createVerifierRouter({
      ...models,
      storageDirectory: process.cwd(),
    })
  );

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('rejects unauthorized access without token or with non-verifier role', async () => {
  const models = {};

  await withVerifierServer(models, async (baseUrl) => {
    // No token
    const resNoToken = await fetch(`${baseUrl}/api/verifier/stats`);
    assert.equal(resNoToken.status, 401);

    // Donor token
    const donorToken = createToken(ROLES.DONOR);
    const resDonor = await fetch(`${baseUrl}/api/verifier/stats`, {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert.equal(resDonor.status, 403);

    // Farmer token
    const farmerToken = createToken(ROLES.FARMER);
    const resFarmer = await fetch(`${baseUrl}/api/verifier/stats`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(resFarmer.status, 403);
  });
});

test('verifier can fetch dashboard statistics from models', async () => {
  const UserModel = {
    async countDocuments(query) {
      if (query.farmerVerificationStatus === 'pending') return 3;
      if (query.farmerVerificationStatus === 'under_review') return 1;
      if (query.farmerVerificationStatus === 'verified') return 5;
      if (query.farmerVerificationStatus === 'rejected') return 2;
      return 0;
    },
  };
  const AssistanceRequestModel = {
    async countDocuments(query) {
      if (query.status === REQUEST_STATUS.APPROVED) return 4;
      return 2;
    },
  };

  const verifierToken = createToken(ROLES.VERIFIER);

  await withVerifierServer({ UserModel, AssistanceRequestModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/verifier/stats`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.farmerVerification.pendingReviews, 3);
    assert.equal(data.farmerVerification.verified, 5);
    assert.equal(data.assistanceRequests.requestsApproved, 4);
  });
});

test('farmer cannot be verified if mandatory documents are not verified', async () => {
  const farmerId = new mongoose.Types.ObjectId().toString();
  const farmer = {
    _id: farmerId,
    role: ROLES.FARMER,
    farmerVerificationStatus: 'pending',
    save: async () => {},
  };

  const UserModel = {
    async findOne() {
      return farmer;
    },
  };

  // Only aadhaar verified, land_certificate is still pending
  const DocumentModel = {
    async find() {
      return [
        { type: 'aadhaar', verificationStatus: DOCUMENT_STATUS.VERIFIED },
        { type: 'land_certificate', verificationStatus: DOCUMENT_STATUS.PENDING },
      ];
    },
  };

  const verifierToken = createToken(ROLES.VERIFIER);

  await withVerifierServer({ UserModel, DocumentModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/verifier/farmers/${farmerId}/verify`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${verifierToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /both mandatory documents/i);
    assert.equal(farmer.farmerVerificationStatus, 'pending');
  });
});

test('farmer is verified successfully when both mandatory documents are verified', async () => {
  const farmerId = new mongoose.Types.ObjectId().toString();
  let saved = false;
  const farmer = {
    _id: farmerId,
    name: 'Ramesh Patil',
    role: ROLES.FARMER,
    farmerVerificationStatus: 'pending',
    verificationStatus: 'pending',
    save: async () => {
      saved = true;
    },
  };

  const UserModel = {
    async findOne() {
      return farmer;
    },
  };

  const DocumentModel = {
    async find() {
      return [
        { type: 'aadhaar', verificationStatus: DOCUMENT_STATUS.VERIFIED },
        { type: 'land_certificate', verificationStatus: DOCUMENT_STATUS.VERIFIED },
      ];
    },
  };

  const AuditLogModel = {
    async create() {},
  };

  const verifierToken = createToken(ROLES.VERIFIER);

  await withVerifierServer({ UserModel, DocumentModel, AuditLogModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/verifier/farmers/${farmerId}/verify`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${verifierToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve', remarks: 'All documents verified' }),
    });

    assert.equal(res.status, 200);
    assert.equal(saved, true);
    assert.equal(farmer.farmerVerificationStatus, 'verified');
    assert.equal(farmer.verificationStatus, VERIFICATION_STATUS.VERIFIED);
  });
});

test('cannot approve donation request if farmer is not verified', async () => {
  const requestId = new mongoose.Types.ObjectId().toString();
  const farmerId = new mongoose.Types.ObjectId().toString();

  const requestItem = {
    _id: requestId,
    farmerId: {
      _id: farmerId,
      farmerVerificationStatus: 'pending',
    },
    status: REQUEST_STATUS.SUBMITTED,
    save: async () => {},
  };

  const AssistanceRequestModel = {
    findById() {
      return {
        populate: async () => requestItem,
      };
    },
  };

  const verifierToken = createToken(ROLES.VERIFIER);

  await withVerifierServer({ AssistanceRequestModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/verifier/requests/${requestId}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${verifierToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /verified farmers may be published/i);
    assert.equal(requestItem.status, REQUEST_STATUS.SUBMITTED);
  });
});

test('verifier can approve request for publication when farmer is verified', async () => {
  const requestId = new mongoose.Types.ObjectId().toString();
  const farmerId = new mongoose.Types.ObjectId().toString();
  let saved = false;

  const requestItem = {
    _id: requestId,
    farmerId: {
      _id: farmerId,
      farmerVerificationStatus: 'verified',
    },
    status: REQUEST_STATUS.SUBMITTED,
    save: async () => {
      saved = true;
    },
  };

  const AssistanceRequestModel = {
    findById() {
      return {
        populate: async () => requestItem,
      };
    },
  };

  const AuditLogModel = {
    async create() {},
  };

  const verifierToken = createToken(ROLES.VERIFIER);

  await withVerifierServer({ AssistanceRequestModel, AuditLogModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/verifier/requests/${requestId}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${verifierToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve', remarks: 'Legitimate equipment need' }),
    });

    assert.equal(res.status, 200);
    assert.equal(saved, true);
    assert.equal(requestItem.status, REQUEST_STATUS.APPROVED);
    assert.notEqual(requestItem.reviewedAt, undefined);
  });
});
