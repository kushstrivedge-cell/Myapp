import { z } from 'zod';

const password = z.string().min(8).max(128);

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .union([z.string().regex(/^\d{10}$/), z.literal('')])
    .transform(value => value || null),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  })
  .refine(value => value.currentPassword !== value.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
});
