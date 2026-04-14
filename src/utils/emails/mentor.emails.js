/**
 * Generates Mentor templated emails
 */

const generateSessionRequestedEmail = (name, sessionType, scheduledAt, topic) => {
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37;">Mentor Session Requested</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        You have successfully requested a <strong style="color: #ffffff;">${sessionType}</strong> session with your mentor.
      </p>
      <div style="background-color: #111111; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 14px; color: #a1a1aa; margin: 5px 0;"><strong>Scheduled At:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
        <p style="font-size: 14px; color: #a1a1aa; margin: 5px 0;"><strong>Topic:</strong> ${topic}</p>
      </div>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        The mentor will review and confirm this session shortly.
      </p>
    </div>
  `;
};

const generateSessionUpdateEmail = (status, meetLink, notes) => {
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37;">Mentor Session Update</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello,</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Your mentor session status has been updated to: <strong style="color: #D4AF37;">${status ? status.toUpperCase() : "UPDATED"}</strong>
      </p>
      ${meetLink ? `<p style="font-size: 14px; color: #a1a1aa;"><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #3b82f6; text-decoration: none;">Join Call</a></p>` : ""}
      ${notes ? `<p style="font-size: 14px; color: #a1a1aa; background-color: #111111; padding: 10px; border-left: 3px solid #D4AF37; margin-top: 15px;"><strong>Mentor Notes:</strong> ${notes}</p>` : ""}
    </div>
  `;
};

module.exports = {
  generateSessionRequestedEmail,
  generateSessionUpdateEmail
};
