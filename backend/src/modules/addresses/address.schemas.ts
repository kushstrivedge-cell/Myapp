import { z } from 'zod';

const fields = {
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\d{10}$/),
  addressLine: z.string().trim().min(5).max(250),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
};

export const createAddressSchema = z.object({
  ...fields,
  isDefault: z.boolean().optional().default(false),
});
export const updateAddressSchema = z.object(fields);
