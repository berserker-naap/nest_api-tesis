export const ProfileValidationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  MISMATCH: 'MISMATCH',
  FAILED: 'FAILED',
} as const;

export type ProfileValidationStatus =
  (typeof ProfileValidationStatus)[keyof typeof ProfileValidationStatus];
