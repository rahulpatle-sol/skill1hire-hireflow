const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: "Skill1 Hire <noreply@rahulpatle.xyz>", // ya apna domain verify kara ho to: noreply@yourdomain.com
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
};

const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your Skill1 Hire account",
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
    subject: "Reset your Skill1 Hire password",
    html: `
      <h2>Hello ${name}!</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${url}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>This link expires in 1 hour. Ignore if you didn't request this.</p>
    `,
  });
};
// console.log("RESEND KEY:", process.env.RESEND_API_KEY); // debug
module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };