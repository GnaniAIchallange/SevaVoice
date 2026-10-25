import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { AssistanceRequest, Document, User } from '../src/models/index.js';
import { DOCUMENT_STATUS, REQUEST_STATUS, ROLES, VERIFICATION_STATUS } from '../src/utils/constants.js';

async function seedTestData() {
  await connectDB();

  console.log('Seeding verification & donor assistance test data...');

  // Find or pick farmers
  const farmers = await User.find({ role: ROLES.FARMER });
  if (farmers.length === 0) {
    console.log('No farmers found. Please run seed.js first.');
    return;
  }

  // Farmer 1: Ramesh Patil -> Make verified with approved documents
  const verifiedFarmer = farmers[0];
  verifiedFarmer.farmerVerificationStatus = 'verified';
  verifiedFarmer.verificationStatus = VERIFICATION_STATUS.VERIFIED;
  verifiedFarmer.verifiedAt = new Date();
  verifiedFarmer.verificationRemarks = 'Aadhaar and Land Records verified and approved.';

  // Ensure documents exist for this verified farmer
  let aadhaar = await Document.findOne({ ownerId: verifiedFarmer._id, type: 'aadhaar' });
  if (!aadhaar) {
    aadhaar = await Document.create({
      ownerId: verifiedFarmer._id,
      type: 'aadhaar',
      storageKey: 'b8dbc8ec-46b7-402d-8bdf-9053013d6124.png',
      mimeType: 'image/png',
      size: 5189554,
      verificationStatus: DOCUMENT_STATUS.VERIFIED,
      verifiedAt: new Date(),
    });
  } else {
    aadhaar.verificationStatus = DOCUMENT_STATUS.VERIFIED;
    await aadhaar.save();
  }

  let landDoc = await Document.findOne({ ownerId: verifiedFarmer._id, type: 'land_certificate' });
  if (!landDoc) {
    landDoc = await Document.create({
      ownerId: verifiedFarmer._id,
      type: 'land_certificate',
      storageKey: 'fe3e5e26-22a3-48ce-acb6-e99e529cc993.png',
      mimeType: 'image/png',
      size: 5189554,
      verificationStatus: DOCUMENT_STATUS.VERIFIED,
      verifiedAt: new Date(),
    });
  } else {
    landDoc.verificationStatus = DOCUMENT_STATUS.VERIFIED;
    await landDoc.save();
  }

  verifiedFarmer.documents = [aadhaar._id, landDoc._id];
  await verifiedFarmer.save();

  // Create assistance requests
  // Clean previous test requests for this farmer to avoid duplication
  await AssistanceRequest.deleteMany({ farmerId: verifiedFarmer._id });

  // 1. Approved request (visible to donors)
  await AssistanceRequest.create({
    farmerId: verifiedFarmer._id,
    title: 'Drip Irrigation Installation for Sugarcane',
    purpose: 'Installing a solar-powered drip irrigation system to conserve water during dry months.',
    reason: 'Severe groundwater depletion has reduced crop yield by 40%. A drip system will save water and protect our primary sugarcane harvest.',
    intendedUse: 'Purchasing 200m drip pipes, filters, pressure regulator valves, and solar pump integration fittings.',
    category: 'irrigation',
    amountRequested: 45000,
    amountFunded: 12000,
    status: REQUEST_STATUS.APPROVED,
    reviewedAt: new Date(),
    reviewNotes: 'Verified farming land size and crop requirements. Validated irrigation vendor quote.',
  });

  // 2. Pending request (in Section B queue awaiting verifier decision)
  await AssistanceRequest.create({
    farmerId: verifiedFarmer._id,
    title: 'High-Yield Certified Wheat & Bio-Fertilizers',
    purpose: 'Procurement of certified seed varieties and organic bio-fertilizer for upcoming winter sowing season.',
    reason: 'Unseasonal rain degraded our saved seeds. Need quality-certified wheat seeds to plant on 3.5 acres.',
    intendedUse: 'Certified high-yield wheat seed bags (120 kg) and 10 bags of certified organic bio-fertilizer.',
    category: 'seeds',
    amountRequested: 18500,
    amountFunded: 0,
    status: REQUEST_STATUS.SUBMITTED,
  });

  // Farmer 2: If another farmer exists, create an unverified request to test ineligibility
  if (farmers.length > 1) {
    const unverifiedFarmer = farmers[1];
    unverifiedFarmer.farmerVerificationStatus = 'pending';
    await unverifiedFarmer.save();

    await AssistanceRequest.deleteMany({ farmerId: unverifiedFarmer._id });
    await AssistanceRequest.create({
      farmerId: unverifiedFarmer._id,
      title: 'Solar Fence for Wild Animal Protection',
      purpose: 'Erecting solar fencing around crop perimeter.',
      reason: 'Wild boars frequently enter and damage standing crops.',
      intendedUse: 'Electric energizer and wire fence poles.',
      category: 'equipment',
      amountRequested: 28000,
      amountFunded: 0,
      status: REQUEST_STATUS.SUBMITTED,
    });
  }

  console.log('Sample test records created successfully!');
}

seedTestData()
  .catch((err) => {
    console.error('Seed test data failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
