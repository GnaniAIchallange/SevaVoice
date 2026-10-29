import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { REQUEST_STATUS, ROLES } from '../utils/constants.js';

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/sevavoice-test';
process.env.JWT_SECRET ??= 'test-secret-at-least-thirty-two-characters';

const { createAdminRouter } = await import('./adminRoutes.js');

function createToken(role = ROLES.ADMIN, sub = new mongoose.Types.ObjectId().toString()) {
  return jwt.sign({ sub, role }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

async function withAdminServer(models, run) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', createAdminRouter(models));

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

test('admin endpoint rejects unauthenticated requests', async () => {
  await withAdminServer({}, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/stats`);
    assert.equal(res.status, 401);
  });
});

test('admin endpoint rejects non-admin users (e.g. verifier, donor, farmer)', async () => {
  const donorToken = createToken(ROLES.DONOR);
  const verifierToken = createToken(ROLES.VERIFIER);

  await withAdminServer({}, async (baseUrl) => {
    const resDonor = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert.equal(resDonor.status, 403);

    const resVerifier = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
    });
    assert.equal(resVerifier.status, 403);
  });
});

test('admin can fetch system overview stats', async () => {
  const adminToken = createToken(ROLES.ADMIN);

  const UserModel = {
    async countDocuments(query) {
      if (!query) return 10;
      if (query.role === ROLES.FARMER) return 5;
      if (query.role === ROLES.DONOR) return 3;
      if (query.role === ROLES.VERIFIER) return 1;
      if (query.role === ROLES.ADMIN) return 1;
      if (query.isActive === true) return 9;
      if (query.isActive === false) return 1;
      return 2;
    },
  };

  const AssistanceRequestModel = {
    async countDocuments(query) {
      if (!query) return 8;
      if (query.status === REQUEST_STATUS.APPROVED) return 4;
      return 1;
    },
    async aggregate() {
      return [{ totalRequested: 50000, totalFunded: 25000 }];
    },
  };

  const DonationModel = {
    find() {
      return {
        select() {
          return {
            async lean() {
              return [
                { amount: 1500, status: 'completed' },
                { amount: 3500, status: 'completed' },
              ];
            },
          };
        },
      };
    },
  };

  const AuditLogModel = {
    find() {
      return {
        sort() {
          return {
            limit() {
              return {
                populate() {
                  return {
                    async lean() {
                      return [];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  await withAdminServer(
    { UserModel, AssistanceRequestModel, DonationModel, AuditLogModel },
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.users.total, 10);
      assert.equal(data.users.farmers, 5);
      assert.equal(data.financials.completedDonationsCount, 2);
      assert.equal(data.financials.totalFundsRaised, 25000);
    }
  );
});

test('admin can list users with pagination and role filters', async () => {
  const adminToken = createToken(ROLES.ADMIN);
  const sampleUsers = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Farmer John',
      phone: '9876543210',
      role: 'farmer',
      isActive: true,
      farmerVerificationStatus: 'verified',
      village: 'Khed',
      state: 'Maharashtra',
      createdAt: new Date(),
    },
  ];

  const UserModel = {
    async countDocuments() {
      return 1;
    },
    find() {
      return {
        sort() {
          return {
            skip() {
              return {
                limit() {
                  return {
                    async lean() {
                      return sampleUsers;
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  await withAdminServer({ UserModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/users?role=farmer&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.users.length, 1);
    assert.equal(data.users[0].name, 'Farmer John');
  });
});

test('admin cannot deactivate own account', async () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminToken = createToken(ROLES.ADMIN, adminId);

  await withAdminServer({}, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/users/${adminId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /cannot deactivate their own account/i);
  });
});

test('admin can override request status and record audit log', async () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminToken = createToken(ROLES.ADMIN, adminId);
  const requestId = new mongoose.Types.ObjectId();

  let savedStatus = null;
  const mockRequest = {
    _id: requestId,
    status: REQUEST_STATUS.SUBMITTED,
    async save() {
      savedStatus = this.status;
      return this;
    },
  };

  const AssistanceRequestModel = {
    async findById(id) {
      if (String(id) === String(requestId)) return mockRequest;
      return null;
    },
  };

  let auditCreated = false;
  const AuditLogModel = {
    async create(entry) {
      auditCreated = true;
      assert.equal(entry.action, 'ADMIN_REQUEST_STATUS_OVERRIDE');
      assert.equal(entry.after.status, REQUEST_STATUS.APPROVED);
      return entry;
    },
  };

  await withAdminServer(
    { AssistanceRequestModel, AuditLogModel },
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: REQUEST_STATUS.APPROVED,
          reviewNotes: 'Approved after verification by head admin',
        }),
      });
      assert.equal(res.status, 200);
      assert.equal(savedStatus, REQUEST_STATUS.APPROVED);
      assert.equal(auditCreated, true);
    }
  );
});
