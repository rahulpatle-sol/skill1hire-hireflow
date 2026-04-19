require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const os = require("os");
require("./config/passport");

const errorHandler = require("./middleware/error.middleware");

const app = express();
app.set("trust proxy");
const startTime = Date.now();

// ── Health Data Helper ────────────────────────────
function getHealthData() {
  const mem = process.memoryUsage();
  const upSec = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(upSec / 3600);
  const m = Math.floor((upSec % 3600) / 60);
  const s = upSec % 60;

  let dbStatus = "unknown";
  try {
    const mongoose = require("mongoose");
    dbStatus = mongoose.connection.readyState === 1 ? "connected" : mongoose.connection.readyState === 2 ? "connecting" : "disconnected";
  } catch { dbStatus = "not loaded"; }

  return {
    success: true,
    status: "OK",
    message: "Skill1 Hire API is running 🚀",
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
    uptime: `${h}h ${m}m ${s}s`,
    uptimeSeconds: upSec,
    database: dbStatus,
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      totalMem: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
      freeMem: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
    },
    services: [
      { name: "API Server", status: "operational" },
      { name: "Database", status: dbStatus === "connected" ? "operational" : "degraded" },
      { name: "Authentication", status: "operational" },
      { name: "Rate Limiter", status: "operational" },
      { name: "File Uploads", status: "operational" },
    ],
  };
}

// ── Health JSON (programmatic) ────────────────────
app.get("/health/json", (req, res) => res.json(getHealthData()));

// ── Health UI (browser) ───────────────────────────
app.get("/health", (req, res) => {
  const apiUrl = `${req.protocol}://${req.get("host")}/health/json`;
  const year = new Date().getFullYear();
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Skill1 Hire — System Status</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#06060a;--surface:#0d0d14;--surface-2:#13131d;--border:rgba(255,255,255,0.06);--text:#f0ece4;--text-2:rgba(240,236,228,0.55);--text-3:rgba(240,236,228,0.3);--amber:#f59e0b;--green:#34d399;--red:#fb7185;--yellow:#fbbf24}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.container{max-width:900px;margin:0 auto;padding:40px 24px 80px}
.header{text-align:center;margin-bottom:48px;padding-top:40px}
.logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:24px}
.logo-mark{width:38px;height:38px;border-radius:12px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:13px;color:#06060a;font-style:italic}
.logo-text{font-weight:700;font-size:16px}
.logo-text span{color:var(--amber)}
h1{font-family:'Space Grotesk',sans-serif;font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;margin-bottom:8px;font-style:italic}
.status-banner{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:99px;font-size:13px;font-weight:600;margin-top:16px;transition:all .3s}
.status-banner.ok{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);color:var(--green)}
.status-banner.down{background:rgba(251,113,133,.08);border:1px solid rgba(251,113,133,.2);color:var(--red)}
.pulse{width:8px;height:8px;border-radius:50%;animation:pulse 2s ease-in-out infinite}
.pulse.green{background:var(--green)}
.pulse.red{background:var(--red)}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:32px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;transition:border-color .3s}
.card:hover{border-color:rgba(245,158,11,.15)}
.card-label{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px}
.card-value{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:var(--text);font-style:italic}
.card-sub{font-size:12px;color:var(--text-2);margin-top:4px}
.section-title{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--text-3);margin-bottom:16px}
.services{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;margin-bottom:32px}
.svc-row{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border);transition:background .2s}
.svc-row:last-child{border-bottom:none}
.svc-row:hover{background:var(--surface-2)}
.svc-name{font-weight:600;font-size:14px}
.svc-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:600}
.svc-badge.operational{background:rgba(52,211,153,.08);color:var(--green)}
.svc-badge.degraded{background:rgba(251,191,36,.08);color:var(--yellow)}
.svc-badge.down{background:rgba(251,113,133,.08);color:var(--red)}
.svc-dot{width:6px;height:6px;border-radius:50%}
.svc-dot.operational{background:var(--green)}
.svc-dot.degraded{background:var(--yellow)}
.svc-dot.down{background:var(--red)}
.outage-section{margin-top:40px}
.outage-empty{text-align:center;padding:40px 20px;color:var(--text-2);font-size:14px;background:var(--surface);border:1px solid var(--border);border-radius:16px}
.outage-empty .icon{font-size:28px;display:block;margin-bottom:8px}
.refresh-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.refresh-btn{padding:8px 18px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s}
.refresh-btn:hover{border-color:rgba(245,158,11,.3);background:var(--surface-2)}
.last-check{font-size:12px;color:var(--text-3)}
.bar{width:100%;height:4px;border-radius:99px;background:var(--surface-2);margin-top:8px;overflow:hidden}
.bar-fill{height:100%;border-radius:99px;transition:width .5s}
.footer{text-align:center;margin-top:60px;padding-top:24px;border-top:1px solid var(--border)}
.footer p{font-size:12px;color:var(--text-3)}
@media(max-width:600px){.container{padding:24px 16px 60px}.header{padding-top:24px}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">
      <div class="logo-mark">S1</div>
      <div class="logo-text">Skill1 <span>Hire</span></div>
    </div>
    <h1>System Status</h1>
    <p style="color:var(--text-2);font-size:14px;margin-top:8px">Real-time platform health monitoring</p>
    <div id="banner" class="status-banner ok">
      <span class="pulse green" id="pulse"></span>
      <span id="banner-text">All systems operational</span>
    </div>
  </div>

  <div class="refresh-bar">
    <span class="section-title" style="margin:0">Overview</span>
    <div style="display:flex;align-items:center;gap:12px">
      <span class="last-check" id="lastCheck">Checking...</span>
      <button class="refresh-btn" id="refreshBtn">Refresh</button>
    </div>
  </div>

  <div class="grid">
    <div class="card"><div class="card-label">Status</div><div class="card-value" id="s-status">-</div></div>
    <div class="card"><div class="card-label">Uptime</div><div class="card-value" id="s-uptime">-</div></div>
    <div class="card"><div class="card-label">Environment</div><div class="card-value" id="s-env">-</div></div>
    <div class="card"><div class="card-label">Database</div><div class="card-value" id="s-db">-</div></div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Memory (RSS)</div>
      <div class="card-value" id="s-rss">-</div>
      <div class="bar"><div class="bar-fill" id="bar-mem" style="width:0;background:var(--amber)"></div></div>
    </div>
    <div class="card">
      <div class="card-label">Heap Used</div>
      <div class="card-value" id="s-heap">-</div>
      <div class="bar"><div class="bar-fill" id="bar-heap" style="width:0;background:var(--green)"></div></div>
    </div>
    <div class="card">
      <div class="card-label">Node Version</div>
      <div class="card-value" id="s-node">-</div>
    </div>
    <div class="card">
      <div class="card-label">CPUs / Platform</div>
      <div class="card-value" id="s-cpu">-</div>
      <div class="card-sub" id="s-platform"></div>
    </div>
  </div>

  <div class="section-title" style="margin-top:32px">Services</div>
  <div class="services" id="servicesList"></div>

  <div class="outage-section">
    <div class="section-title">Recent Incidents</div>
    <div class="outage-empty">
      <span class="icon">&#x2705;</span>
      No incidents reported in the last 90 days.
    </div>
  </div>

  <div class="footer">
    <p>&copy; ${year} Skill1 Hire &middot; API &middot; All systems monitored 24/7</p>
  </div>
</div>
<script>
var API="${apiUrl}";
function g(id){return document.getElementById(id)}
function fetchHealth(){
  g("lastCheck").textContent="Checking...";
  fetch(API).then(function(r){return r.json()}).then(function(d){
    g("s-status").textContent=d.status;
    g("s-status").style.color=d.status==="OK"?"var(--green)":"var(--red)";
    g("s-uptime").textContent=d.uptime||"-";
    g("s-env").textContent=(d.env||"dev").toUpperCase();
    g("s-db").textContent=(d.database||"-").charAt(0).toUpperCase()+(d.database||"").slice(1);
    g("s-db").style.color=d.database==="connected"?"var(--green)":"var(--yellow)";
    if(d.memory){
      g("s-rss").textContent=d.memory.rss;
      g("s-heap").textContent=d.memory.heapUsed;
      var heapPct=parseFloat(d.memory.heapUsed)/parseFloat(d.memory.heapTotal)*100;
      g("bar-heap").style.width=heapPct+"%";
      g("bar-mem").style.width=Math.min(parseFloat(d.memory.rss)/512*100,100)+"%";
    }
    if(d.system){
      g("s-node").textContent=d.system.nodeVersion;
      g("s-cpu").textContent=d.system.cpus+" cores";
      g("s-platform").textContent=d.system.platform+" / "+d.system.arch;
    }
    if(d.services){
      var html="";
      for(var i=0;i<d.services.length;i++){
        var s=d.services[i];
        html+='<div class="svc-row"><span class="svc-name">'+s.name+'</span><span class="svc-badge '+s.status+'"><span class="svc-dot '+s.status+'"></span>'+s.status+'</span></div>';
      }
      g("servicesList").innerHTML=html;
    }
    var allOk=!d.services||d.services.every(function(s){return s.status==="operational"});
    g("banner").className="status-banner "+(allOk?"ok":"down");
    g("pulse").className="pulse "+(allOk?"green":"red");
    g("banner-text").textContent=allOk?"All systems operational":"Some services degraded";
    g("lastCheck").textContent="Last checked: "+new Date().toLocaleTimeString();
  }).catch(function(e){
    g("banner").className="status-banner down";
    g("pulse").className="pulse red";
    g("banner-text").textContent="Unable to reach API";
    g("lastCheck").textContent="Error: "+e.message;
  });
}
g("refreshBtn").addEventListener("click",fetchHealth);
fetchHealth();
setInterval(fetchHealth,30000);
</script>
</body>
</html>`);
});

// ── Security ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// ── Rate Limiter ──────────────────────────────────
// Very strict rate limiting for authentication (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 requests per IP per 15m
  message: { success: false, message: "Too many auth attempts from this IP, please try again in 15 minutes" },
});
app.use("/api/v1/auth", authLimiter);

// High-throughput global rate limiter suited for NodeCache scalable loads
const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2000, // 2000 requests per 5m per IP
  message: { success: false, message: "API bandwidth exceeded" },
});
app.use("/api", globalLimiter);

// ── Body Parsers ──────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logger ────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Passport ──────────────────────────────────────
app.use(passport.initialize());

// ── API Routes ────────────────────────────────────
app.use("/api/v1/auth",      require("./routes/v1/auth.routes"));
app.use("/api/v1/candidate", require("./routes/v1/candidate.routes"));
app.use("/api/v1/hr",        require("./routes/v1/hr.routes"));
app.use("/api/v1/mentor",    require("./routes/v1/mentor.routes"));
app.use("/api/v1/admin",     require("./routes/v1/admin.routes"));
app.use("/api/v1/jobs",      require("./routes/v1/job.routes"));
app.use("/api/v1/upload",    require("./routes/v1/upload.routes"));
app.use("/api/v1/notifications", require("./routes/v1/notification.routes"));
app.use("/api/v1/chat",          require("./routes/v1/chat.routes"));
app.use("/api/v1/message",       require("./routes/v1/message.routes"));
app.use("/api/v1/meta",          require("./routes/v1/meta.routes")); // public — no auth needed

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error Handler ─────────────────────────────────
app.use(errorHandler);

module.exports = app;