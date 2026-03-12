const nodemailer = require("nodemailer");

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"HireFlow" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  return info;
};

const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your HireFlow account",
    html: `
      <h2>Hello ${name}!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your HireFlow password",
    html: `
      <h2>Hello ${name}!</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${url}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>This link expires in 1 hour. Ignore if you didn't request this.</p>
    `,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
