import { beforeEach, describe, expect, it, jest } from "@jest/globals";

process.env.NODE_ENV = "test";

const mockCreateCompletion = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockPoolQuery = jest.fn();

jest.unstable_mockModule("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  })),
}));

jest.unstable_mockModule("firebase-admin", () => ({
  default: {
    credential: {
      cert: jest.fn(),
    },
    initializeApp: jest.fn(),
    auth: () => ({
      verifyIdToken: mockVerifyIdToken,
    }),
  },
}));

jest.unstable_mockModule("pg", () => ({
  default: {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockPoolQuery,
    })),
  },
}));

const { default: request } = await import("supertest");
const { default: app } = await import("./index.js");

describe("Partition Testing - POST /api/summarize", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: "test-user-1",
      email: "student@example.com",
    });
  });

  it("PT1 Valid Instructions: standard medical text returns 200", async () => {
    // Partition: Valid Instructions
    mockPoolQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ history_enabled: false }],
    });
    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "Summary: Take medicine with food." } }],
    });

    const response = await request(app)
      .post("/api/summarize")
      .set("Authorization", "Bearer fake-token")
      .send({ instructions: "Take amoxicillin 500mg twice daily for 7 days." });

    expect(response.status).toBe(200);
    expect(response.body.summary).toContain("Summary:");
  });

  it("PT2 Empty Input: empty instructions string returns 400", async () => {
    // Partition: Empty Input
    const response = await request(app)
      .post("/api/summarize")
      .set("Authorization", "Bearer fake-token")
      .send({ instructions: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Missing or invalid/i);
  });

  it("PT3 Extremely Long Input: >5000 chars is handled without crashing", async () => {
    // Partition: Extremely Long Input
    const longInstructions = "A".repeat(5001);

    mockPoolQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ history_enabled: false }],
    });
    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "Summary: Long input processed." } }],
    });

    const response = await request(app)
      .post("/api/summarize")
      .set("Authorization", "Bearer fake-token")
      .send({ instructions: longInstructions });

    expect(response.status).toBe(200);
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  it("PT4 Poorly Formatted Input: non-string instructions returns 400", async () => {
    // Partition: Poorly Formatted/Malformed Text
    const response = await request(app)
      .post("/api/summarize")
      .set("Authorization", "Bearer fake-token")
      .send({ instructions: { malformed: true } });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Missing or invalid/i);
  });

  it("PT5 Missing Information: request body without instructions key returns 400", async () => {
    // Partition: Missing Information
    const response = await request(app)
      .post("/api/summarize")
      .set("Authorization", "Bearer fake-token")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Missing or invalid/i);
  });
});
