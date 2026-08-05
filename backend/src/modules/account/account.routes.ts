import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { accountService } from './account.service.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from './account.schemas.js';

export const accountRouter = Router();
accountRouter.use(authenticate);

accountRouter.patch('/profile', async (request, response) => {
  const input = updateProfileSchema.parse(request.body);
  response.json({
    success: true,
    data: await accountService.updateProfile(request.auth!.userId, input),
  });
});

accountRouter.post('/change-password', async (request, response) => {
  const input = changePasswordSchema.parse(request.body);
  response.json({
    success: true,
    data: await accountService.changePassword(
      request.auth!.userId,
      input.currentPassword,
      input.newPassword,
    ),
  });
});

accountRouter.delete('/', async (request, response) => {
  const { password } = deleteAccountSchema.parse(request.body);
  await accountService.deleteAccount(request.auth!.userId, password);
  response.status(204).send();
});
