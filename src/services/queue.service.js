const emailUtils = require("../utils/email");

let emailQueueReady = false;

console.log("🚀 Queue Service Initialized (Sync Mode)");

async function enqueueEmail(to, subject, body) {
  try {
    if (emailUtils && emailUtils.sendEmail) {
      await emailUtils.sendEmail({ to, subject, html: body });
      console.log(`[Queue] Email sent to: ${to}`);
    } else {
      console.log(`[Queue] Simulated Email to: ${to} | Subject: ${subject}`);
    }
  } catch (error) {
    console.error(`[Queue] Email failed:`, error.message);
  }
}

async function enqueueAssessmentScoring(candidateId, answers) {
  console.log(`[Queue] Processing assessment for ${candidateId}`);
  await new Promise(r => setTimeout(r, 100));
}

module.exports = {
  emailQueue: { add: () => {} },
  enqueueEmail,
  enqueueAssessmentScoring
};