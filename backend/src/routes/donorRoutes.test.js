import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { REQUEST_STATUS, ROLES } from '../utils/constants.js';

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/sevavoice-test';
process.env.JWT_SECRET ??= 'test-secret-at-least-thirty-two-characters';

const { createDonorRouter } = await import('./donorRoutes.js');

async function withDonorServer(models, run) {
  const app = express();
  app.use(express.json());
  app.use('/api/donor', createDonorRouter(models));

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

test('donors only see approved requests from verified farmers', async () => {
  const verifiedFarmerId = new mongoose.Types.ObjectId();
  const unverifiedFarmerId = new mongoose.Types.ObjectId();

  const UserModel = {
    find(query) {
      return {
        select() {
          return {
            async lean() {
              // Only verified farmer matches query
              return [{ _id: verifiedFarmerId }];
            },
          };
        },
      };
    },
  };

  const sampleApprovedRequest = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Drip Irrigation Setup',
    purpose: 'Need drip irrigation for sugarcane crop',
    amountRequested: 35000,
    amountFunded: 5000,
    category: 'irrigation',
    status: REQUEST_STATUS.APPROVED,
    farmerId: {
      name: 'Ramesh Patil',
      village: 'Shirur',
      district: 'Pune',
      state: 'Maharashtra',
      farmerVerificationStatus: 'verified',
    },
    createdAt: new Date(),
  };

  const AssistanceRequestModel = {
    async countDocuments(query) {
      // Must filter by approved status and verified farmers
      assert.equal(query.status, REQUEST_STATUS.APPROVED);
      assert.deepEqual(query.farmerId, { $in: [verifiedFarmerId] });
      return 1;
    },
    find(query) {
      assert.equal(query.status, REQUEST_STATUS.APPROVED);
      return {
        populate() {
          return {
            sort() {
              return {
                skip() {
                  return {
                    limit() {
                      return {
                        async lean() {
                          return [sampleApprovedRequest];
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
    },
  };

  await withDonorServer({ UserModel, AssistanceRequestModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/donor/requests`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].title, 'Drip Irrigation Setup');
    assert.equal(body.items[0].farmer.name, 'Ramesh Patil');
    // Ensure sensitive fields are not present
    assert.equal(body.items[0].farmer.phone, undefined);
    assert.equal(body.items[0].farmer.passwordHash, undefined);
  });
});

test('public request details endpoint rejects unapproved requests and unverified farmers', async () => {
  const validRequestId = new mongoose.Types.ObjectId().toString();
  const unapprovedRequestId = new mongoose.Types.ObjectId().toString();

  const approvedRequest = {
    _id: validRequestId,
    status: REQUEST_STATUS.APPROVED,
    title: 'Seed Purchase Assistance',
    farmerId: {
      name: 'Sunita Jadhav',
      farmerVerificationStatus: 'verified',
      isActive: true,
    },
  };

  const pendingRequest = {
    _id: unapprovedRequestId,
    status: REQUEST_STATUS.SUBMITTED,
    title: 'Pending Request',
    farmerId: {
      name: 'Ramesh Patil',
      farmerVerificationStatus: 'pending',
      isActive: true,
    },
  };

  const AssistanceRequestModel = {
    findById(id) {
      return {
        populate() {
          return {
            async lean() {
              if (String(id) === validRequestId) return approvedRequest;
              if (String(id) === unapprovedRequestId) return pendingRequest;
              return null;
            },
          };
        },
      };
    },
  };

  await withDonorServer({ AssistanceRequestModel }, async (baseUrl) => {
    // Approved request should succeed
    const resValid = await fetch(`${baseUrl}/api/donor/requests/${validRequestId}`);
    assert.equal(resValid.status, 200);
    const validBody = await resValid.json();
    assert.equal(validBody.request.title, 'Seed Purchase Assistance');

    // Pending / unapproved request should be hidden (404)
    const resPending = await fetch(`${baseUrl}/api/donor/requests/${unapprovedRequestId}`);
    assert.equal(resPending.status, 404);
  });
});

test('create-order rejects unapproved request or invalid amount', async () => {
  const requestId = new mongoose.Types.ObjectId();
  const AssistanceRequestModel = {
    findById() {
      return {
        populate() {
          return {
            async lean() {
              return {
                _id: requestId,
                status: REQUEST_STATUS.SUBMITTED, // not approved
                farmerId: { isActive: true, farmerVerificationStatus: 'verified' },
              };
            },
          };
        },
      };
    },
  };

  await withDonorServer({ AssistanceRequestModel }, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/donor/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: String(requestId), amount: 0 }),
    });
    assert.equal(res.status, 400);

    const resUnapproved = await fetch(`${baseUrl}/api/donor/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: String(requestId), amount: 500 }),
    });
    assert.equal(resUnapproved.status, 400);
  });
});

test('create-order and verify-payment succeed with valid signature', async () => {
  const requestId = new mongoose.Types.ObjectId();
  const donationId = new mongoose.Types.ObjectId();

  const AssistanceRequestModel = {
    findById() {
      return {
        populate() {
          return {
            async lean() {
              return {
                _id: requestId,
                status: REQUEST_STATUS.APPROVED,
                amountRequested: 5000,
                amountFunded: 0,
                farmerId: { isActive: true, farmerVerificationStatus: 'verified' },
              };
            },
          };
        },
      };
    },
    async findByIdAndUpdate(id, update) {
      assert.equal(String(id), String(requestId));
      return {
        _id: requestId,
        amountRequested: 5000,
        amountFunded: update.$inc.amountFunded,
        status: REQUEST_STATUS.APPROVED,
        async save() {},
      };
    },
  };

  const mockDonation = {
    _id: donationId,
    requestId,
    amount: 1000,
    status: 'created',
    razorpayOrderId: 'order_test123',
    async save() {
      return this;
    },
  };

  const DonationModel = {
    async create(doc) {
      return { ...mockDonation, ...doc };
    },
    async findById(id) {
      if (String(id) === String(donationId)) return mockDonation;
      return null;
    },
    async findOne() {
      return mockDonation;
    },
  };

  const orderCreator = async ({ amount }) => ({
    orderId: 'order_test123',
    amount: amount * 100,
    currency: 'INR',
    keyId: 'rzp_test_123',
    isSimulated: true,
  });

  const signatureVerifier = ({ orderId, paymentId, signature }) => {
    return orderId === 'order_test123' && paymentId === 'pay_test123' && signature === 'valid_sig';
  };

  await withDonorServer(
    { AssistanceRequestModel, DonationModel, orderCreator, signatureVerifier },
    async (baseUrl) => {
      // 1. Create Order
      const createRes = await fetch(`${baseUrl}/api/donor/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: String(requestId), amount: 1000 }),
      });
      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      assert.equal(createData.success, true);
      assert.equal(createData.orderId, 'order_test123');

      // 2. Verify Payment with valid signature
      const verifyRes = await fetch(`${baseUrl}/api/donor/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: String(donationId),
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'valid_sig',
        }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = await verifyRes.json();
      assert.equal(verifyData.success, true);
      assert.equal(mockDonation.status, 'completed');
      assert.equal(mockDonation.razorpayPaymentId, 'pay_test123');
    }
  );
});

