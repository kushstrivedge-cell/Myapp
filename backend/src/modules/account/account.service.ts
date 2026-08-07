import { AppError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';

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

async function userOrThrow(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
}

export const accountService = {
  async updateProfile(
    userId: string,
    input: { name: string; phone: string | null },
  ) {
    if (input.phone) {
      const owner = await prisma.user.findFirst({
        where: { phone: input.phone, id: { not: userId } },
        select: { id: true },
      });
      if (owner)
        throw new AppError(
          409,
          'This phone number is already in use',
          'PHONE_EXISTS',
        );
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });
    return publicUser(user);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await userOrThrow(userId);
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new AppError(
        400,
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD',
      );
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction(async transaction => {
      await transaction.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await transaction.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return {
      message: 'Password changed successfully. Sign in again on your devices.',
    };
  },

  async deleteAccount(userId: string, password: string) {
    const user = await userOrThrow(userId);
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(400, 'Password is incorrect', 'INVALID_PASSWORD');
    }
    await prisma.$transaction(async transaction => {
      await transaction.returnRequest.deleteMany({ where: { userId } });
      await transaction.order.deleteMany({ where: { userId } });
      await transaction.user.delete({ where: { id: userId } });
    });
  },
};
