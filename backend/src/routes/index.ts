import {Router} from 'express';
import {authRouter} from '../modules/auth/auth.routes.js';
import {catalogueRouter} from '../modules/catalogue/catalogue.routes.js';
import {accountRouter} from '../modules/account/account.routes.js';
import {addressRouter} from '../modules/addresses/address.routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/account', accountRouter);
apiRouter.use('/addresses', addressRouter);
apiRouter.use(catalogueRouter);
