import nodemailer from "nodemailer";

export async function sendEmail(
  smtpUser: string,
  smtpPass: string,
  to: string,
  subject: string,
  body: string
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: smtpUser,
    to,
    subject,
    text: body,
    html: `
      <pre style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; white-space: pre-wrap; margin: 0;">
${body}
      </pre>
    `,
  });

  return info;
}

export async function verifySmtpConnection(smtpUser: string, smtpPass: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter.verify();
}
