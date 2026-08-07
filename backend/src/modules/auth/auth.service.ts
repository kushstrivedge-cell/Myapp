import { VerificationPurpose } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';
import { sendOtpEmail } from '../../lib/email.js';
import { AppError } from '../../lib/errors.js';
import { createOtp, hashOtp, otpMatches } from '../../lib/otp.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../../lib/tokens.js';

const publicUser = (user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  emailVerifiedAt: Date | null;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? '',
  role: user.role,
  emailVerified: Boolean(user.emailVerifiedAt),
});

async function sendCode(
  userId: string,
  email: string,
  purpose: VerificationPurpose,
) {
  await prisma.verificationCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const code = createOtp();
  await prisma.verificationCode.create({
    data: {
      userId,
      purpose,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000),
    },
  });
  await sendOtpEmail(email, code, purpose);
}

async function consumeCode(
  email: string,
  code: string,
  purpose: VerificationPurpose,
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    throw new AppError(
      400,
      'Verification code is invalid or expired',
      'INVALID_OTP',
    );
  const record = await prisma.verificationCode.findFirst({
    where: {
      userId: user.id,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record || !otpMatches(code, record.codeHash)) {
    if (record)
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    throw new AppError(
      400,
      'Verification code is invalid or expired',
      'INVALID_OTP',
    );
  }
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return user;
}

async function issueTokens(user: { id: string; role: string }) {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(user.id, user.role),
    createRefreshToken(user.id),
  ]);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing?.emailVerifiedAt)
      throw new AppError(
        409,
        'An account with this email already exists',
        'EMAIL_EXISTS',
      );
    const passwordHash = await hashPassword(input.password);
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { name: input.name, phone: input.phone, passwordHash },
        })
      : await prisma.user.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone,
            passwordHash,
          },
        });
    await sendCode(user.id, user.email, VerificationPurpose.EMAIL_VERIFICATION);
    return { message: 'Verification code sent', email: user.email };
  },
  async verifyEmail(email: string, code: string) {
    const user = await consumeCode(
      email,
      code,
      VerificationPurpose.EMAIL_VERIFICATION,
    );
    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });
    return { user: publicUser(verified), ...(await issueTokens(verified)) };
  },
  async resendEmailOtp(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt)
      await sendCode(
        user.id,
        user.email,
        VerificationPurpose.EMAIL_VERIFICATION,
      );
    return {
      message: 'If the account is awaiting verification, a new code was sent',
    };
  },
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new AppError(
        401,
        'Email or password is incorrect',
        'INVALID_CREDENTIALS',
      );
    if (!user.active)
      throw new AppError(
        403,
        'This account has been suspended',
        'ACCOUNT_SUSPENDED',
      );
    if (!user.emailVerifiedAt)
      throw new AppError(
        403,
        'Verify your email before signing in',
        'EMAIL_NOT_VERIFIED',
      );
    return { user: publicUser(user), ...(await issueTokens(user)) };
  },
  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(
        401,
        'Refresh token is invalid or expired',
        'INVALID_REFRESH_TOKEN',
      );
    }
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      stored.userId !== payload.sub ||
      !stored.user.active
    )
      throw new AppError(
        401,
        'Refresh token is invalid or expired',
        'INVALID_REFRESH_TOKEN',
      );
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return {
      user: publicUser(stored.user),
      ...(await issueTokens(stored.user)),
    };
  },
  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user)
      await sendCode(user.id, user.email, VerificationPurpose.PASSWORD_RESET);
    return { message: 'If an account exists, a reset code was sent' };
  },
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await consumeCode(
      email,
      code,
      VerificationPurpose.PASSWORD_RESET,
    );
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction(async transaction => {
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await transaction.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { message: 'Password updated successfully' };
  },
  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');
    return { user: publicUser(user) };
  },
};
