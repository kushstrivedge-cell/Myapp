import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

type AddressInput = {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
};

async function ownedAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address)
    throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');
  return address;
}

export const addressService = {
  list(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async create(userId: string, input: AddressInput & { isDefault: boolean }) {
    return prisma.$transaction(async transaction => {
      const count = await transaction.address.count({ where: { userId } });
      const isDefault = input.isDefault || count === 0;
      if (isDefault)
        await transaction.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      return transaction.address.create({
        data: { ...input, userId, isDefault },
      });
    });
  },

  async update(userId: string, addressId: string, input: AddressInput) {
    await ownedAddress(userId, addressId);
    return prisma.address.update({ where: { id: addressId }, data: input });
  },

  async makeDefault(userId: string, addressId: string) {
    await ownedAddress(userId, addressId);
    return prisma.$transaction(async transaction => {
      await transaction.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      return transaction.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  },

  async remove(userId: string, addressId: string) {
    const address = await ownedAddress(userId, addressId);
    await prisma.$transaction(async transaction => {
      await transaction.address.delete({ where: { id: addressId } });
      if (address.isDefault) {
        const replacement = await transaction.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (replacement)
          await transaction.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
      }
    });
  },
};
