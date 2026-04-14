const { Queue, Worker } = require("bullmq");
const emailUtils = require("../utils/email"); // Assuming this has sendEmail

// Standard Redis Connection string
const REDIS_CONNECTION = process.env.REDIS_URL || {
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null // Required by BullMQ
};

let emailQueue = null;
let emailWorker = null;

try {
  // ── 1. Create the Queue ──
  emailQueue = new Queue("emailQueue", { connection: REDIS_CONNECTION });

  console.log("🚀 BullMQ Message Queues Initialized");

  // ── 2. Create the Worker ──
  // The worker runs asynchronously in the background, freeing up the main Node.js event loop
  emailWorker = new Worker("emailQueue", async (job) => {
    switch (job.name) {
      case "sendMail":
        const { to, subject, body } = job.data;
        // Delegate to original email utility
        if (emailUtils && emailUtils.sendEmail) {
            await emailUtils.sendEmail({ to, subject, html: body });
        } else {
            console.log(`[Queue] Simulated Email to: ${to} | Subject: ${subject}`);
        }
        break;
        
      case "processAssessment":
        // Simulation for heavy CPU work
        const { candidateId, answers } = job.data;
        console.log(`[Queue] Processing heavy assessment calculation for ${candidateId}`);
        await new Promise(r => setTimeout(r, 2000)); // simulate 2 sec load
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }, { connection: REDIS_CONNECTION });

  emailWorker.on("completed", (job) => {
    console.log(`✅ [Queue] Job ${job.id} (${job.name}) has completed!`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`❌ [Queue] Job ${job.id} (${job.name}) has failed:`, err.message);
  });
  
} catch (error) {
  console.warn("⚠️ Redis/BullMQ failed to connect. Running in degraded sync mode.", error.message);
}

/**
 * Offload sending email to the background queue
 */
async function enqueueEmail(to, subject, body) {
  if (emailQueue) {
    await emailQueue.add("sendMail", { to, subject, body }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 }
    });
  } else {
    // Graceful fallback to sync operation if queue totally failed
    if (emailUtils && emailUtils.sendEmail) {
        await emailUtils.sendEmail({ to, subject, html: body });
    }
  }
}

/**
 * Offload Assessment Grading (heavy CPU loop)
 */
async function enqueueAssessmentScoring(candidateId, answers) {
   if (emailQueue) {
     await emailQueue.add("processAssessment", { candidateId, answers });
   }
}

module.exports = {
  emailQueue,
  enqueueEmail,
  enqueueAssessmentScoring
};
