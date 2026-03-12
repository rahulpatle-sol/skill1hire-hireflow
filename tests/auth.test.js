// Set env vars BEFORE any module loads
process.env.JWT_SECRET = "test_jwt_secret_32_chars_minimum_ok";
process.env.JWT_EXPIRES_IN = "1d";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32chars_minok";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";

const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock mongoose connect
jest.mock("../src/config/db", () => jest.fn().mockResolvedValue(true));

const mockUserBase = {
  _id: "64f1a2b3c4d5e6f7a8b9c0d1",
  name: "Test User",
  email: "test@example.com",
  role: "candidate",
  isEmailVerified: false,
  isVerified: false,
  isActive: true,
  authProvider: "local",
  refreshToken: null,
};

jest.mock("../src/models/User.model", () => {
  const m = jest.fn().mockImplementation((data) => ({
    ...mockUserBase, ...data,
    save: jest.fn().mockResolvedValue(true),
    comparePassword: jest.fn().mockResolvedValue(true),
    toJSON() { const o = { ...this }; delete o.password; return o; },
  }));
  m.findOne = jest.fn();
  m.findById = jest.fn();
  m.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  m.create = jest.fn();
  m.countDocuments = jest.fn().mockResolvedValue(0);
  return m;
});

jest.mock("../src/models/CandidateProfile.model", () => ({
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../src/models/HRProfile.model", () => ({
  create: jest.fn().mockResolvedValue({ _id: "hr123" }),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../src/models/MentorProfile.model", () => ({
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../src/utils/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

const User = require("../src/models/User.model");
const app = require("../src/app");

const makeToken = (payload = {}) =>
  jwt.sign({ id: mockUserBase._id, role: "candidate", ...payload }, process.env.JWT_SECRET, { expiresIn: "1d" });

describe("Auth API Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Health ──────────────────────────────────
  test("GET /health → 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("GET /api/v1/unknown → 404", async () => {
    const res = await request(app).get("/api/v1/nothing-here");
    expect(res.statusCode).toBe(404);
  });

  // ── Register ────────────────────────────────
  test("POST /auth/register → 201 success", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      ...mockUserBase, role: "candidate",
      save: jest.fn().mockResolvedValue(true),
      toJSON() { return { email: this.email, role: this.role, _id: this._id }; },
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "John Doe", email: "john@test.com", password: "Test@1234", role: "candidate",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  test("POST /auth/register → 409 duplicate email", async () => {
    User.findOne.mockResolvedValue(mockUserBase);
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "John", email: "existing@test.com", password: "Test@1234",
    });
    expect(res.statusCode).toBe(409);
  });

  test("POST /auth/register → 422 invalid email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "John", email: "not-email", password: "Test@1234",
    });
    expect(res.statusCode).toBe(422);
  });

  test("POST /auth/register → 422 short password", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "John", email: "john@test.com", password: "123",
    });
    expect(res.statusCode).toBe(422);
  });

  test("POST /auth/register → 422 missing name", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "john@test.com", password: "Test@1234",
    });
    expect(res.statusCode).toBe(422);
  });

  test("POST /auth/register → 400 invalid role", async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "John", email: "john@test.com", password: "Test@1234", role: "hacker",
    });
    expect([400, 422]).toContain(res.statusCode);
  });

  // ── Login ────────────────────────────────────
  test("POST /auth/login → 200 success", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        ...mockUserBase, authProvider: "local", password: "hashed",
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        toJSON() { return { email: this.email }; },
      }),
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com", password: "Test@1234",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test("POST /auth/login → 401 wrong password", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        ...mockUserBase, authProvider: "local",
        comparePassword: jest.fn().mockResolvedValue(false),
      }),
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com", password: "wrong",
    });
    expect(res.statusCode).toBe(401);
  });

  test("POST /auth/login → 401 user not found", async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@test.com", password: "Test@1234",
    });
    expect(res.statusCode).toBe(401);
  });

  test("POST /auth/login → 422 missing email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ password: "Test@1234" });
    expect(res.statusCode).toBe(422);
  });

  // ── Get Me ───────────────────────────────────
  test("GET /auth/me → 200 with valid token", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUserBase) });
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${makeToken()}`);
    expect(res.statusCode).toBe(200);
  });

  test("GET /auth/me → 401 no token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.statusCode).toBe(401);
  });

  test("GET /auth/me → 401 bad token", async () => {
    const res = await request(app).get("/api/v1/auth/me")
      .set("Authorization", "Bearer totally.invalid.jwt");
    expect(res.statusCode).toBe(401);
  });

  test("GET /auth/me → 401 expired token", async () => {
    const expiredToken = jwt.sign({ id: mockUserBase._id }, process.env.JWT_SECRET, { expiresIn: "0s" });
    const res = await request(app).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(res.statusCode).toBe(401);
  });

  // ── Refresh Token ────────────────────────────
  test("POST /auth/refresh-token → 200 valid token", async () => {
    const rt = jwt.sign({ id: mockUserBase._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ ...mockUserBase, refreshToken: rt }) });
    const res = await request(app).post("/api/v1/auth/refresh-token").send({ refreshToken: rt });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test("POST /auth/refresh-token → 401 invalid", async () => {
    const res = await request(app).post("/api/v1/auth/refresh-token").send({ refreshToken: "bad" });
    expect(res.statusCode).toBe(401);
  });

  test("POST /auth/refresh-token → 400 missing token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh-token").send({});
    expect([400, 422]).toContain(res.statusCode);
  });

  // ── Logout ───────────────────────────────────
  test("POST /auth/logout → 200", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUserBase) });
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${makeToken()}`);
    expect(res.statusCode).toBe(200);
  });

  // ── Forgot Password ──────────────────────────
  test("POST /auth/forgot-password → 404 no user", async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "x@test.com" });
    expect(res.statusCode).toBe(404);
  });

  // ── Verify Email ─────────────────────────────
  test("GET /auth/verify-email/badtoken → 400", async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/auth/verify-email/badtoken");
    expect([400, 422]).toContain(res.statusCode);
  });

  // ── Role protection ──────────────────────────
  test("GET /candidate/profile → 403 for HR role", async () => {
    const hrUser = { ...mockUserBase, role: "hr" };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(hrUser) });
    const hrToken = makeToken({ role: "hr" });
    const res = await request(app)
      .get("/api/v1/candidate/profile")
      .set("Authorization", `Bearer ${hrToken}`);
    expect(res.statusCode).toBe(403);
  });

  test("GET /candidate/job-feed → 403 unverified candidate", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ ...mockUserBase, isVerified: false }) });
    const res = await request(app)
      .get("/api/v1/candidate/job-feed")
      .set("Authorization", `Bearer ${makeToken()}`);
    expect(res.statusCode).toBe(403);
  });

  test("GET /hr/profile → 403 for candidate role", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUserBase) });
    const res = await request(app)
      .get("/api/v1/hr/profile")
      .set("Authorization", `Bearer ${makeToken({ role: "candidate" })}`);
    expect(res.statusCode).toBe(403);
  });

  test("GET /admin/dashboard → 403 for non-admin", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUserBase) });
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${makeToken({ role: "candidate" })}`);
    expect(res.statusCode).toBe(403);
  });
});
