/**
 * Generates Admin templated emails
 */

const generateProfileVerifiedEmail = (name, role) => {
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37;">Welcome to Skill1 Hire Premium</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Your profile has been fully verified by our administrative team!
      </p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        You can now access exclusive ${role.toUpperCase()} features across the platform. Good luck on your journey.
      </p>
    </div>
  `;
};

const generateProfileRejectedEmail = (name, noteText) => {
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #ef4444;">Account Review Update</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Your profile verification request was updated. Note: <strong>${noteText || 'Please ensure your profile is fully complete before re-applying.'}</strong>
      </p>
    </div>
  `;
};

const generateCapstoneReviewEmail = (name, status, feedback) => {
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37;">Capstone Project Status: ${status.toUpperCase()}</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Your Capstone Project review is complete.
      </p>
      <p style="font-size: 14px; color: #a1a1aa;"><strong>Status:</strong> <span style="color: #10b981;">${status.toUpperCase()}</span></p>
      ${feedback ? `<p style="font-size: 14px; color: #a1a1aa;"><strong>Feedback:</strong> ${feedback}</p>` : ""}
    </div>
  `;
};

module.exports = {
  generateProfileVerifiedEmail,
  generateProfileRejectedEmail,
  generateCapstoneReviewEmail
};
