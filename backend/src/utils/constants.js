export const ROLES = Object.freeze({
  FARMER: 'farmer',
  VERIFIER: 'verifier',
  DONOR: 'donor',
  ADMIN: 'admin',
});

export const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});

export const REQUEST_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FUNDED: 'funded',
});

export const DOCUMENT_TYPES = Object.freeze([
  'identity',
  'land_record',
  'bank_passbook',
  'other',
]);

export const REQUEST_CATEGORIES = Object.freeze([
  'seeds',
  'fertilizer',
  'equipment',
  'irrigation',
  'livestock',
  'medical',
  'other',
]);

export const DOCUMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});

export const LANGUAGES = Object.freeze(['en', 'hi', 'mr']);