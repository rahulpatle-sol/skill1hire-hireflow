/**
 * Generates HR templated emails
 */

const generateCandidateStatusUpdateEmail = (name, jobTitle, status, interviewDate, interviewLink) => {
  const statusFormatted = status.replace("_", " ").toUpperCase();
  return `
    <div style="font-family: inherit; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(212, 175, 55, 0.1);">
      <h2 style="color: #D4AF37; margin-bottom: 20px;">Application Update: ${jobTitle}</h2>
      <p style="font-size: 16px; color: #e4e4e7;">Hello ${name},</p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Your application status is now: <strong style="color: #D4AF37; background: rgba(212, 175, 55, 0.1); padding: 2px 6px; border-radius: 4px;">${statusFormatted}</strong>
      </p>
      ${interviewDate ? `<p style="font-size: 14px; color: #a1a1aa;"><strong>Interview Scheduled:</strong> ${new Date(interviewDate).toLocaleString()}</p>` : ""}
      ${interviewLink ? `<p style="font-size: 14px; color: #a1a1aa;"><strong>Link:</strong> <a href="${interviewLink}" style="color: #10b981; text-decoration: none;">Join Interview</a></p>` : ""}
      <p style="font-size: 14px; color: #52525b; margin-top: 30px;">
        Log in to your candidate dashboard for more explicit timeline details.
      </p>
    </div>
  `;
};

const generateHRJobPostedEmail = (companyName, jobTitle) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
    <h2 style="color: #6366f1;">Job Live Successfully!</h2>
    <p>We're letting you know that your new job posting for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> is now live on Skill1 Hire.</p>
    <p>Candidates can now search and apply for this position.</p>
    <br>
    <div style="background: #f8fafc; padding: 15px; border-radius: 5px; font-size: 14px;">
      <b>Next Steps:</b> Track applications on your HR dashboard explicitly.
    </div>
  </div>
`;

const generateNewApplicationNotifyHR = (hrName, candidateName, jobTitle) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
    <h2 style="color: #6366f1;">New Application Received!</h2>
    <p>Hello ${hrName},</p>
    <p><strong>${candidateName}</strong> has applied for your job posting: <strong>${jobTitle}</strong>.</p>
    <p>Log into your HR dashboard to review the application and take further action.</p>
    <br>
    <div style="background: #f8fafc; padding: 15px; border-radius: 5px; font-size: 14px;">
      <b>Tip:</b> Respond quickly to top candidates before they get picked by others!
    </div>
  </div>
`;

module.exports = {
  generateCandidateStatusUpdateEmail,
  generateHRJobPostedEmail,
  generateNewApplicationNotifyHR,
};
