// src/index.js - ClearCare backend (ESM version)

import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import pkg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ------------------------------------
// Setup __dirname in ES modules
// ------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------
// Load environment variables
// ------------------------------------
dotenv.config();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------------------------
// Firebase Admin initialization
// ----------- -------------------------

// serviceAccountKey.json must be in the backend src/ or root (adjust path as needed)
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ------------------------------------
// Postgres connection (we'll really use it later)
// ------------------------------------
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // or use individual settings:
  // user: process.env.DB_USER,
  // host: process.env.DB_HOST,
  // database: process.env.DB_NAME,
  // password: process.env.DB_PASSWORD,
  // port: process.env.DB_PORT,
});

// ------------------------------------
// Express app setup
// ------------------------------------
const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ------------------------------------
// Middleware: verify Firebase ID token
// ------------------------------------
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // attach decoded token (uid, email, etc.)
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ------------------------------------
// Routes
// ------------------------------------

// Health check (public)
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ClearCare backend is running" });
});

// Secure test route (requires Firebase auth)
app.get("/api/secure-test", verifyToken, (req, res) => {
  res.json({
    message: "Secure route works!",
    uid: req.user.uid,
    email: req.user.email || null,
  });
});

// DB test route (requires Firebase auth)
app.get("/api/db-test", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");

    res.json({
      message: "Database connection OK",
      serverTime: result.rows[0].now,
      uid: req.user.uid,
    });
  } catch (error) {
    console.error("DB test failed:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Summarize medical instructions (requires auth)
app.post("/api/summarize", verifyToken, async (req, res) => {
  try {
    const { instructions } = req.body;

    if (!instructions || typeof instructions !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'instructions' field" });
    }

    const userId = req.user.uid;

    // 1) Call OpenAI to simplify the instructions
    const prompt = `
You are helping a patient understand their medication instructions.

Your job is to explain clearly, not to diagnose or change the doctor's plan.

Given the text below (which may be short, incomplete, or informal), produce a clear explanation that covers:

1) What the medicine(s) are generally used for
   - If you recognize the medicine name, briefly describe its common use in simple language.
   - If you are not sure what a medicine is for, say that you are not sure instead of guessing.

2) How much to take and when
   - If the instructions mention a dose or schedule, repeat it clearly.
   - If details are missing (no dose, no timing, no duration), say what is missing instead of inventing it.

3) Possible side effects of each medicine
   - Mention a few common, high-level side effects in plain language.
   - If you don't know the side effects for a medicine, say that you cannot provide details, instead of making them up.

4) Possible issues when taking the medicines together
   - If you recognize a well-known type of interaction (like "these can both cause drowsiness" or "these can both thin the blood"), you may describe the general concern in simple terms.
   - If you are not sure about interactions, clearly say that you cannot assess the combination and that the patient should ask their doctor or pharmacist.

Very important safety rules:
- Do NOT invent precise doses, schedules, or durations that are not clearly given.
- Do NOT tell the patient to start, stop, or change a medicine.
- Do NOT invent rare or dramatic complications; focus on common, high-level issues only.
- If information is missing, explicitly say what you do not know and suggest they ask their doctor or pharmacist.

Format your answer as plain text (no Markdown, no bullet characters).
Use short sections with labels exactly like this:

Summary:
[1–3 sentences about what the medicine(s) are generally for, in plain language.]

How to take it:
[Repeat any dose/timing/duration information you actually see in the text. If something is missing, say so.]

Side effects:
[Briefly describe common side effects for each medicine you recognize. If you are not sure, say so.]

Taking them together:
[Explain any general concerns about using them together if you recognize them. If you are not sure, say you cannot assess interactions and they should ask a doctor or pharmacist.]

Here are the user-provided instructions or description:
"""${instructions}"""
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // small, fast, good enough for prototype
      messages: [
        { role: "system", content: "You are a careful assistant that explains medical instructions clearly but does not give new diagnoses or override doctors." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const summaryText = completion.choices[0]?.message?.content?.trim();
    if (!summaryText) {
      return res.status(500).json({ error: "No summary generated" });
    }

    // 2) Insert into Postgres
    const insertQuery = `
      INSERT INTO summaries (user_id, original_text, summary_text)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, original_text, summary_text, created_at;
    `;

    const result = await pool.query(insertQuery, [
      userId,
      instructions,
      summaryText,
    ]);

    const row = result.rows[0];

    // 3) Return the saved row to the frontend
    res.json({
      id: row.id,
      user_id: row.user_id,
      original_text: row.original_text,
      summary_text: row.summary_text,
      created_at: row.created_at,
    });
  } catch (error) {
    console.error("Error in /api/summarize:", error);
    res.status(500).json({ error: "Failed to summarize instructions" });
  }
});

app.get('/api/summaries', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Optional: pagination via query params
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await pool.query(
      `
      SELECT id, original_text, summary_text, created_at
      FROM summaries
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );

    res.json({
      summaries: result.rows,
    });
  } catch (err) {
    console.error('Error fetching summaries:', err);
    res.status(500).json({ error: 'Failed to fetch summaries' });
  }
});

app.delete('/api/summaries/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const summaryId = parseInt(req.params.id, 10);

    // Only delete if the row belongs to this user
    const result = await pool.query(
      `
      DELETE FROM summaries
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [summaryId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ success: true, id: summaryId });
  } catch (err) {
    console.error('Error deleting summary:', err);
    res.status(500).json({ error: 'Failed to delete summary' });
  }
});



// ------------------------------------
// Start server
// ------------------------------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`ClearCare backend listening on port ${PORT}`);
});
