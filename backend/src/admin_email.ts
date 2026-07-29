import nodemailer from "nodemailer";

export async function sendEmail(smtpUser: string, smtpPass: string, to: string, subject: string, html: string) {
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
    html,
  });
  return info;
}
