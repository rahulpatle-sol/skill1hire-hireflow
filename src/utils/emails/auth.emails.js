/**
 * Generates Auth templated emails
 */

const generateLoginSuccessEmail = (name) => {
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; text-align: center; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.2);">
      <h2 style="color: #D4AF37; margin-bottom: 20px;">Welcome Back to Skill1 Hire</h2>
      <p style="font-size: 16px; color: #a1a1aa;">Hello, ${name}!</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        We noticed your account was just accessed. If this was you, there is no further action required.
      </p>
      <div style="margin-top: 30px; font-size: 12px; color: #52525b;">
        <p>Stay ahead with Skill1 Hire.</p>
        <p style="color: #D4AF37;">Security Team</p>
      </div>
    </div>
  `;
};

module.exports = {
  generateLoginSuccessEmail,
};
