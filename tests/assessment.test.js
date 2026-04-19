// Set env vars BEFORE any module loads
process.env.JWT_SECRET = "test_jwt_secret_32_chars_minimum_ok";
process.env.NODE_ENV = "test";

const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock core DB and models
jest.mock("../src/config/db", () => jest.fn().mockResolvedValue(true));

const mockCandidate = { _id: "cand123", role: "candidate" };

jest.mock("../src/models/User.model", () => ({
  findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(mockCandidate) }),
}));

jest.mock("../src/models/CandidateProfile.model", () => ({
  findOne: jest.fn().mockResolvedValue({ _id: "profile123", user: "cand123", overallScore: 50 }),
  findOneAndUpdate: jest.fn().mockResolvedValue({}),
}));

jest.mock("../src/models/Assessment.model", () => {
  const Assessment = jest.fn();
  Assessment.find = jest.fn();
  Assessment.findById = jest.fn();
  
  const AssessmentResult = jest.fn();
  AssessmentResult.find = jest.fn();
  AssessmentResult.create = jest.fn();
  AssessmentResult.countDocuments = jest.fn().mockResolvedValue(0);
  
  return { Assessment, AssessmentResult };
});

const app = require("../src/app");
const { Assessment, AssessmentResult } = require("../src/models/Assessment.model");

const makeToken = () => jwt.sign({ id: mockCandidate._id, role: "candidate" }, process.env.JWT_SECRET);

describe("Assessment API Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  test("POST /assessments/:id/submit → MCQ only (Auto-grade)", async () => {
    Assessment.findById.mockResolvedValue({
      _id: "asm123",
      questions: [
        { type: "mcq", marks: 10, correctAnswer: 1 },
        { type: "mcq", marks: 10, correctAnswer: 1 }
      ]
    });
    AssessmentResult.create.mockImplementation(data => Promise.resolve({ ...data, _id: "res123" }));

    const res = await request(app)
      .post("/api/v1/candidate/assessments/asm123/submit")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        answers: [
          { questionIndex: 0, selectedOption: 1 }, // Correct (10)
          { questionIndex: 1, selectedOption: 1 }  // Correct (10)
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.result.status).toBe("passed");
    expect(res.body.data.result.totalMarksObtained).toBe(20);
  });

  test("POST /assessments/:id/submit → Descriptive (Manual Review)", async () => {
    Assessment.findById.mockResolvedValue({
      _id: "asmDescr",
      questions: [
        { type: "descriptive", marks: 50 }
      ]
    });
    AssessmentResult.create.mockImplementation(data => Promise.resolve({ ...data, _id: "res456" }));

    const res = await request(app)
      .post("/api/v1/candidate/assessments/asmDescr/submit")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        answers: [
          { questionIndex: 0, answerText: "This is my long answer...", answerFileUrl: "http://file.com" }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.result.status).toBe("pending_review");
    expect(res.body.data.result.isPassed).toBe(false);
  });
});
