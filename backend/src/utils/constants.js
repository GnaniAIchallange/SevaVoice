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
  UNDER_REVIEW: 'under_review',
  ADDITIONAL_INFO_REQUIRED: 'additional_info_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FUNDED: 'funded',
  CLOSED: 'closed',
});

export const DOCUMENT_TYPES = Object.freeze([
  'identity',
  'aadhaar',
  'land_record',
  'land_certificate',
  'supporting',
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
  NEEDS_REPLACEMENT: 'needs_replacement',
});

export const LANGUAGES = Object.freeze(['en', 'hi', 'mr']);