export const OTP_LENGTH = 6;

export const OTP_EXPIRY_MINUTES = 5;

export const OTP_MAX_ATTEMPTS = 5;

export const OTP_BCRYPT_ROUNDS = 10;

/**
 * Cost factor for staff passwords. Higher than the OTP factor on purpose: an
 * OTP is six digits that expire in five minutes, whereas a password is
 * long-lived and worth brute-forcing, so the extra hashing cost per attempt is
 * bought cheaply. 12 keeps one verification around 200-300ms — tolerable on a
 * login route, expensive in bulk.
 */
export const PASSWORD_BCRYPT_ROUNDS = 12;

/** Floor for staff passwords, enforced by the seed script. */
export const PASSWORD_MIN_LENGTH = 10;
