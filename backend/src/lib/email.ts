import nodemailer from 'nodemailer';
import {env} from '../config/env.js';

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: env.SMTP_USER && env.SMTP_PASS ? {user: env.SMTP_USER, pass: env.SMTP_PASS} : undefined})
  : null;

export async function sendOtpEmail(email: string, code: string, purpose: string) {
  if (!transport) {
    console.info(`[development email] ${purpose} OTP for ${email}: ${code}`);
    return;
  }
  await transport.sendMail({from: env.SMTP_FROM, to: email, subject: purpose === 'PASSWORD_RESET' ? 'Reset your Cartly password' : 'Verify your Cartly email', text: `Your Cartly verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`});
}
