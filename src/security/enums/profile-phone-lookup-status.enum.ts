export const ProfilePhoneLookupStatus = {
  NOT_ASSOCIATED: 'NOT_ASSOCIATED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
} as const;

export type ProfilePhoneLookupStatus =
  (typeof ProfilePhoneLookupStatus)[keyof typeof ProfilePhoneLookupStatus];
