import { randomInt, randomUUID } from "crypto";
import nodemailer from "nodemailer";

const DEFAULT_CODE_TTL_MINUTES = 10;

export const EMAIL_CODE_TTL_MINUTES = Number(
  process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES ??
    DEFAULT_CODE_TTL_MINUTES.toString(),
);

export const EMAIL_CODE_TTL_MS = EMAIL_CODE_TTL_MINUTES * 60 * 1000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let mailTransporter: nodemailer.Transporter | null = null;

export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isValidEmail = (value: string) => emailPattern.test(value);

export const buildEmailChangeIdentifier = (userId: string, nextEmail: string) =>
  `profile-email-change:${userId}:${normalizeEmail(nextEmail)}`;

export const generateEmailVerificationCode = () =>
  randomInt(100000, 1000000).toString();

export const createStoredEmailToken = (code: string) =>
  `${code}:${randomUUID()}`;

const getSmtpConfig = (): SmtpConfig | null => {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    return null;
  }

  const parsedPort = Number(portRaw);

  if (!Number.isFinite(parsedPort)) {
    return null;
  }

  const normalizedPass = host.toLowerCase().includes("gmail")
    ? pass.replace(/\s+/g, "")
    : pass.trim();

  return {
    host: host.trim(),
    port: parsedPort,
    secure: parsedPort === 465,
    user: user.trim(),
    pass: normalizedPass,
    from: from.trim() || user.trim(),
  };
};

const getTransporter = (config: SmtpConfig) => {
  if (mailTransporter) {
    return mailTransporter;
  }

  mailTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return mailTransporter;
};

export const sendEmailVerificationCode = async (
  toEmail: string,
  code: string,
  displayName: string,
) => {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    if (process.env.NODE_ENV !== "production") {
      console.info("PROFILE_EMAIL_CODE_DEV", {
        toEmail,
        code,
      });

      return {
        delivered: false,
        devFallback: true,
        messageId: null,
        response: null,
      };
    }

    throw new Error("SMTP service is not configured");
  }

  const info = await getTransporter(smtpConfig).sendMail({
    from: smtpConfig.from,
    to: toEmail,
    subject: "Verify your new DIME email address",
    text: [
      `Hi ${displayName || "there"},`,
      "",
      "Use the following verification code to confirm your new email address:",
      code,
      "",
      `This code expires in ${EMAIL_CODE_TTL_MINUTES} minutes.`,
      "",
      "If you did not request this change, you can safely ignore this email.",
      "",
      "- DIME Team",
    ].join("\n"),
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("PROFILE_EMAIL_CODE_SENT", {
      toEmail,
      messageId: info.messageId,
    });
  }

  return {
    delivered: true,
    devFallback: false,
    messageId: info.messageId,
    response: info.response,
  };
};
