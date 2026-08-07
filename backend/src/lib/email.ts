import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    })
  : null;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export async function sendOtpEmail(
  email: string,
  code: string,
  purpose: string,
) {
  if (!transport) {
    console.info(`[development email] ${purpose} OTP for ${email}: ${code}`);
    return;
  }
  const subject =
    purpose === 'PASSWORD_RESET'
      ? 'Reset your Cartly password'
      : 'Verify your Cartly email';
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject,
    text: `Your Cartly verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`,
    html: `<div style="font-family:Arial;padding:24px"><h1 style="color:#e85d04">Cartly</h1><h2>${subject}</h2><p>Use this one-time code:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</div><p>This code expires in ${env.OTP_TTL_MINUTES} minutes. Never share it.</p></div>`,
  });
}

export type TransactionalEmailOptions = {
  preheader?: string;
  reference?: string;
  details?: Array<{ label: string; value: string }>;
  actionLabel?: string;
  actionUrl?: string;
};

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  heading: string,
  message: string,
  options: TransactionalEmailOptions = {},
) {
  const detailText = (options.details ?? [])
    .map(item => `${item.label}: ${item.value}`)
    .join('\n');
  const actionText = options.actionUrl
    ? `\n\n${options.actionLabel ?? 'View details'}: ${options.actionUrl}`
    : '';
  if (!transport) {
    console.info(
      `[development email] ${subject} to ${to}: ${message}${actionText}`,
    );
    return;
  }

  const detailsHtml = options.details?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f6f7f8;border-radius:10px;padding:16px">${options.details
        .map(
          item =>
            `<tr><td style="padding:7px 4px;color:#66727b;font-size:13px">${escapeHtml(
              item.label,
            )}</td><td align="right" style="padding:7px 4px;color:#101820;font-size:13px;font-weight:700">${escapeHtml(
              item.value,
            )}</td></tr>`,
        )
        .join('')}</table>`
    : '';
  const actionHtml = options.actionUrl
    ? `<div style="margin:28px 0 10px"><a href="${escapeHtml(
        options.actionUrl,
      )}" style="display:inline-block;background:#ffb000;color:#101820;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:8px">${escapeHtml(
        options.actionLabel ?? 'View details',
      )}</a></div>`
    : '';

  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text: `${heading}\n\n${message}${
      options.reference ? `\n\nOrder: ${options.reference}` : ''
    }${detailText ? `\n${detailText}` : ''}${actionText}`,
    html: `<!doctype html><html><body style="margin:0;background:#f3f5f7"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(
      options.preheader ?? message,
    )}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden"><tr><td style="background:#101820;padding:22px 32px"><span style="color:#ffffff;font-family:Arial,sans-serif;font-size:27px;font-weight:800">Cartly<span style="color:#ffb000">.</span></span></td></tr><tr><td style="padding:34px 32px;font-family:Arial,sans-serif;color:#101820"><div style="color:#d94f04;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Order update</div><h1 style="margin:10px 0 12px;font-size:28px;line-height:36px">${escapeHtml(
      heading,
    )}</h1>${
      options.reference
        ? `<div style="margin-bottom:20px;color:#66727b;font-size:14px">Order ${escapeHtml(
            options.reference,
          )}</div>`
        : ''
    }<p style="margin:0;color:#3e4a53;font-size:16px;line-height:25px">${escapeHtml(
      message,
    )}</p>${detailsHtml}${actionHtml}<p style="margin:28px 0 0;color:#7b858c;font-size:12px;line-height:19px">Open this email on the phone where Cartly is installed to track your order.</p></td></tr><tr><td style="background:#f6f7f8;padding:20px 32px;font-family:Arial,sans-serif;color:#7b858c;font-size:12px">This email was sent for an update to your Cartly account.</td></tr></table></td></tr></table></body></html>`,
  });
}
