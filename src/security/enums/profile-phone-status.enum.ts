export const ProfilePhoneStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
} as const;

export type ProfilePhoneStatus =
  (typeof ProfilePhoneStatus)[keyof typeof ProfilePhoneStatus];
