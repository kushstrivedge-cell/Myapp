import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import {env} from './config/env.js';
import {errorHandler, notFound} from './middleware/errorHandler.js';
import {apiRouter} from './routes/index.js';
import {paymentService} from './modules/payments/payment.service.js';

export const app = express();
const allowedOrigins = env.APP_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin(origin, callback) {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error(`Origin ${origin} is not allowed by CORS`));
}}));
app.post('/api/v1/payments/webhook', express.raw({type: 'application/json', limit: '250kb'}), async (request, response) => {
  const data = await paymentService.webhook(request.body as Buffer, request.header('x-razorpay-signature'), request.header('x-razorpay-event-id'));
  response.json({success: true, data});
});
app.use(express.json({limit: '100kb'}));
app.use('/uploads', express.static('uploads', {fallthrough: false, maxAge: '1d'}));
app.get(['/api/health', '/api/v1/health'], (_request, response) =>
  response.json({
    success: true,
    data: {service: 'cartly-api', status: 'ok'},
  }),
);
app.use('/api/v1', apiRouter);
app.use(notFound);
app.use(errorHandler);
