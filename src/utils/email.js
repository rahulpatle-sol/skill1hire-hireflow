const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Skill1 Hire <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("📧 Resend API error:", error);
      throw new Error(error.message);
    }
    console.log(`📧 Email sent to ${to} — id: ${data?.id}`);
    return data;
  } catch (err) {
    console.error("📧 Email send failed:", err.message);
    throw err;
  }
};

const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your Skill1 Hire account",
    html: `
      <div style="font-family:'Inter',sans-serif;background:#050505;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid rgba(212,175,55,0.15);">
        <h2 style="color:#D4AF37;margin-bottom:20px;">Verify Your Email</h2>
        <p style="font-size:16px;color:#e4e4e7;">Hello ${name}!</p>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">Please verify your email by clicking the button below:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${url}" style="background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Verify Email</a>
        </div>
        <p style="font-size:12px;color:#52525b;">This link expires in 24 hours.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your Skill1 Hire password",
    html: `
      <div style="font-family:'Inter',sans-serif;background:#050505;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid rgba(212,175,55,0.15);">
        <h2 style="color:#D4AF37;margin-bottom:20px;">Password Reset</h2>
        <p style="font-size:16px;color:#e4e4e7;">Hello ${name}!</p>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">Click the button below to reset your password:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${url}" style="background:#ef4444;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Reset Password</a>
        </div>
        <p style="font-size:12px;color:#52525b;">This link expires in 1 hour. Ignore if you didn't request this.</p>
      </div>
    `,
  });
};

const sendAssignmentEmail = async (email, name, assignmentTitle, dueDate, dashboardUrl) => {
  await sendEmail({
    to: email,
    subject: "New Assignment Received - Skill1 Hire",
    html: `
      <div style="font-family:'Inter',sans-serif;background:#050505;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid rgba(212,175,55,0.15);">
        <h2 style="color:#D4AF37;margin-bottom:20px;">New Assignment</h2>
        <p style="font-size:16px;color:#e4e4e7;">Hello ${name},</p>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">You have received a new assignment: <strong>${assignmentTitle}</strong>.</p>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">Due Date: <strong>${new Date(dueDate).toLocaleDateString()}</strong></p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${dashboardUrl}" style="background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">View Assignment</a>
        </div>
        <p style="font-size:12px;color:#52525b;">Complete the assignment before the due date to maintain your streak!</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendAssignmentEmail };