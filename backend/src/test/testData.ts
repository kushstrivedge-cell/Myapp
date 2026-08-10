import { randomInt, randomUUID } from 'node:crypto';

export function uniqueTestIdentity(prefix = 'test') {
  return {
    email: `${prefix}-${randomUUID()}@cartly.local`,
    phone: `9${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`,
  };
}
