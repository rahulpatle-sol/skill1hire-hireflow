const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
    from: `Skill1 Hire <${process.env.RESEND_FROM_EMAIL}>`, 
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

const sendScorecardUpdateEmail = async (email, name, { assignmentTitle, score, feedback }) => {
  await sendEmail({
    to: email,
    subject: "Your Assignment Has Been Scored — Skill1 Hire",
    html: `
      <div style="font-family:'Inter',sans-serif;background:#050505;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid rgba(212,175,55,0.15);">
        <h2 style="color:#D4AF37;margin-bottom:20px;">Assignment Reviewed ✅</h2>
        <p style="font-size:16px;color:#e4e4e7;">Hello ${name},</p>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">Your assignment <strong>${assignmentTitle}</strong> has been reviewed by your domain manager.</p>
        <div style="margin:24px 0;padding:20px;border-radius:10px;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);">
          <p style="font-size:28px;font-weight:700;color:#D4AF37;margin:0;">Score: ${score}/100</p>
          ${feedback ? `<p style="font-size:14px;color:#a1a1aa;margin-top:12px;line-height:1.6;"><strong>Feedback:</strong> ${feedback}</p>` : ""}
        </div>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">Your overall scorecard has been updated. Keep pushing — every assignment improves your verified profile score.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${process.env.CLIENT_URL}/candidate/scorecard" style="background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">View My Scorecard</a>
        </div>
        <p style="font-size:12px;color:#52525b;">Skill1 Hire — Where Proof Meets Opportunity</p>
      </div>
    `,
  });
};

const sendManagerCreatedEmail = async (email, name, domains) => {
  await sendEmail({
    to: email,
    subject: "You've Been Appointed as Domain Manager — Skill1 Hire",
    html: `
      <div style="font-family:'Inter',sans-serif;background:#050505;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid rgba(212,175,55,0.15);">
        <h2 style="color:#D4AF37;margin-bottom:20px;">Manager Access Granted 🎯</h2>
        <p style="font-size:16px;color:#e4e4e7;">Hello ${name},</p>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">You have been appointed as a Domain Manager on Skill1 Hire.</p>
        <div style="margin:24px 0;padding:20px;border-radius:10px;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);">
          <p style="font-size:14px;color:#D4AF37;font-weight:700;margin:0 0 8px;">Your Domains:</p>
          <p style="font-size:14px;color:#e4e4e7;margin:0;">${domains || "All assigned domains"}</p>
        </div>
        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;">You can now: manage assessments, assign tasks to candidates, grade submissions, and track scorecards for your domain.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${process.env.CLIENT_URL}/manager/dashboard" style="background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Go to Dashboard</a>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAssignmentEmail,
  sendScorecardUpdateEmail,
  sendManagerCreatedEmail,
};