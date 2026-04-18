/**
 * Generates Candidate templated emails
 */

const generateApplicationReceivedEmail = (name, jobTitle) => {
  return `
    <div style="font-family: 'Inter', sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">Application Received: ${jobTitle}</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        We've successfully received your application for <strong>${jobTitle}</strong>.
      </p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        The recruiting team is currently reviewing your profile. Keep an eye on your candidate dashboard for any status updates.
      </p>
      <p style="font-size: 14px; color: #D4AF37; margin-top: 30px;">Best of luck!</p>
    </div>
  `;
};

const generateAssessmentAssignedEmail = (name, count) => {
  return `
    <div style="font-family: 'Inter', sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">New Assessments Assigned</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        The Admin team has assigned you <strong>${count}</strong> new skill assessment(s).
      </p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Log into your Candidate Dashboard to complete them and boost your HireScore&trade;!
      </p>
    </div>
  `;
};

const generateNewJobAlertEmail = (name, jobTitle, company) => {
  return `
    <div style="font-family: 'Inter', sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">New Job Alert 🚀</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        A new position <strong>${jobTitle}</strong> at <strong>${company}</strong> has been posted on Skill1 Hire.
      </p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Log into your dashboard to view the full details and apply now!
      </p>
      <p style="font-size: 14px; color: #D4AF37; margin-top: 30px;">Don't miss this opportunity!</p>
    </div>
  `;
};

module.exports = {
  generateApplicationReceivedEmail,
  generateAssessmentAssignedEmail,
  generateNewJobAlertEmail,
};
