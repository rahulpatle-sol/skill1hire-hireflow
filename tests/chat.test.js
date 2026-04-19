// Set env vars BEFORE any module loads
process.env.JWT_SECRET = "test_jwt_secret_32_chars_minimum_ok";
process.env.NODE_ENV = "test";

const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock core DB
jest.mock("../src/config/db", () => jest.fn().mockResolvedValue(true));

const mockUser = { _id: "64f1a2b3c4d5e6f7a8b9c0d1", name: "Sender" };
const mockRemoteUser = { _id: "64f1a2b3c4d5e6f7a8b9c0d2", name: "Remote" };

const mockQuery = (val) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation((res) => Promise.resolve(val).then(res)),
});

jest.mock("../src/models/User.model", () => ({
  findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) }),
  populate: jest.fn().mockImplementation((val) => Promise.resolve(val)),
}));

jest.mock("../src/models/Chat.model", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
}));

jest.mock("../src/models/Message.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
  populate: jest.fn().mockImplementation((val) => Promise.resolve(val)),
}));

const app = require("../src/app");
const Chat = require("../src/models/Chat.model");
const Message = require("../src/models/Message.model");

const makeToken = () => jwt.sign({ id: mockUser._id, role: "candidate" }, process.env.JWT_SECRET);

describe("Chat/Messaging Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    app.set("io", { to: jest.fn().mockReturnThis(), emit: jest.fn() });
  });

  test("GET /chat", async () => {
    Chat.find.mockReturnValue(mockQuery([{ _id: "c1", participants: [mockUser] }]));
    const res = await request(app).get("/api/v1/chat").set("Authorization", `Bearer ${makeToken()}`);
    expect(res.statusCode).toBe(200);
  });

  test("POST /message", async () => {
    Chat.findById = jest.fn().mockResolvedValue({ _id: "c1", participants: [mockUser] });
    
    // Create an instance that returns itself from populate()
    const msgInstance = {
      _id: "m1",
      text: "hi",
      chat: { _id: "c1", participants: [mockUser] },
      toObject: () => ({ text: "hi" }),
    };
    // Make populate return Message (the promise) which resolves to msgInstance
    msgInstance.populate = jest.fn().mockImplementation(() => Promise.resolve(msgInstance));
    
    Message.create.mockResolvedValue(msgInstance);
    // Static Message.populate
    Message.populate.mockResolvedValue(msgInstance);

    const res = await request(app)
      .post("/api/v1/message")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ chatId: "c1", text: "hi" });

    expect(res.statusCode).toBe(201);
  });
});
