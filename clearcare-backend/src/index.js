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

    // -------------------------------
    // 1. Load user's privacy settings
    // -------------------------------
    const settingsResult = await pool.query(
      `
      SELECT history_enabled
      FROM user_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    let historyEnabled = true;
    if (settingsResult.rowCount > 0) {
      historyEnabled = settingsResult.rows[0].history_enabled;
    } else {
      // Create row if missing
      const insertSettings = await pool.query(
        `
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        RETURNING history_enabled
        `,
        [userId]
      );
      historyEnabled = insertSettings.rows[0].history_enabled;
    }

    // -------------------------------
    // 2. Call OpenAI (same as before)
    // -------------------------------
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
Use sections with labels:

Summary:
How to take it:
Side effects:
Taking them together:

User text:
"""${instructions}"""
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a careful assistant that explains medical instructions clearly but does not give new diagnoses or override doctors.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const summaryText = completion.choices[0]?.message?.content?.trim();
    if (!summaryText) {
      return res.status(500).json({ error: "No summary generated" });
    }

    // -------------------------------
    // 3. Conditionally save to DB
    // -------------------------------
    let savedRow = null;

    if (historyEnabled) {
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

      savedRow = result.rows[0];
    }

    // -------------------------------
    // 4. Return consistent response
    // -------------------------------
    return res.json({
      summary: summaryText,
      saved: !!savedRow,
      record: savedRow,
    });
  } catch (error) {
    console.error("Error in /api/summarize:", error);
    res.status(500).json({ error: "Failed to summarize instructions" });
  }
});


// Get summaries for the authenticated user
app.get("/api/summaries", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    // -------------------------------
    // 1. Load user's settings
    // -------------------------------
    const settingsResult = await pool.query(
      `
      SELECT auto_delete_30_days
      FROM user_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    let autoDelete30 = false;
    if (settingsResult.rowCount > 0) {
      autoDelete30 = settingsResult.rows[0].auto_delete_30_days;
    }

    // -------------------------------
    // 2. Query DB depending on setting
    // -------------------------------
    let query;
    let params;

    if (autoDelete30) {
      query = `
        SELECT id, original_text, summary_text, created_at
        FROM summaries
        WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, limit, offset];
    } else {
      query = `
        SELECT id, original_text, summary_text, created_at
        FROM summaries
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, limit, offset];
    }

    const result = await pool.query(query, params);

    return res.json({
      summaries: result.rows,
      auto_delete_30_days: autoDelete30,
    });
  } catch (err) {
    console.error("Error fetching summaries:", err);
    res.status(500).json({ error: "Failed to fetch summaries" });
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

async function getOrCreateUserSettings(userId) {
  // Try to fetch existing settings
  const existing = await pool.query(
    `
    SELECT user_id, history_enabled, auto_delete_30_days
    FROM user_settings
    WHERE user_id = $1
    `,
    [userId]
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  // If no row, create one with defaults
  const inserted = await pool.query(
    `
    INSERT INTO user_settings (user_id)
    VALUES ($1)
    RETURNING user_id, history_enabled, auto_delete_30_days
    `,
    [userId]
  );

  return inserted.rows[0];
}

// Get current user's settings
app.get('/api/user-settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const settings = await getOrCreateUserSettings(userId);
    res.json({ settings });
  } catch (err) {
    console.error('Error fetching user settings:', err);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update current user's settings (partial patched)
app.patch('/api/user-settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { history_enabled, auto_delete_30_days } = req.body;

    const fields = [];
    const values = [userId];
    let index = 2;

    if (typeof history_enabled === 'boolean') {
      fields.push(`history_enabled = $${index++}`);
      values.push(history_enabled);
    }

    if (typeof auto_delete_30_days === 'boolean') {
      fields.push(`auto_delete_30_days = $${index++}`);
      values.push(auto_delete_30_days);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const query = `
      UPDATE user_settings
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, history_enabled, auto_delete_30_days
    `;

    const result = await pool.query(query, values);
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('Error updating user settings:', err);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

app.delete('/api/summaries', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const result = await pool.query(
      `
      DELETE FROM summaries
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({
      success: true,
      deleted_count: result.rowCount,
    });
  } catch (err) {
    console.error('Error deleting user summaries:', err);
    res.status(500).json({ error: 'Failed to delete summaries' });
  }
});



// ------------------------------------
// Start server
// ------------------------------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`ClearCare backend listening on port ${PORT}`);
});
