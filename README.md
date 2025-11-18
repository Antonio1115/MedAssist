# MedAssist — AI-Powered Medical Instruction Simplifier

A secure, privacy-focused platform for turning medical instructions into clear, patient-friendly explanations.

---

## 📌 Overview

MedAssist is a full-stack web application that helps users understand their medical instructions by generating safe, simplified summaries using AI. The system was designed with a strong focus on privacy, security, and ethical data handling. Users can control how their data is stored, update their account information securely, and view their past summaries in a clean, medical-style interface.

The system uses:

* **React + Vite** (frontend)
* **Node.js + Express** (backend)
* **Firebase Authentication** (secure login, password updates, display name)
* **PostgreSQL** (history + privacy settings)
* **OpenAI API** (zero-retention summarization)
* **TailwindCSS** (UI styling)

MedAssist was developed as part of a Computer Science course focused on responsible AI, system security, and ethical design.

---

## ✨ Key Features

### 🧠 AI Medical Summary Generation

* Users paste or type medical instructions.
* Backend generates a clear, patient-friendly summary.
* Strict safety rules prevent:

  * Diagnosis or treatment instructions
  * Inventing doses or schedules
  * Guessing medication purposes
  * Hidden or misleading medical advice
* Summary warns when information is missing.

### 🔐 Authentication & Account Security

* Email/password login (Firebase)
* Display name + email updates
* Secure password-change flow:

  * Current password required
  * New password twice
  * Uses Firebase reauthentication
* Optional prototype 2FA toggle (local only)

### 📚 Conversation History (PostgreSQL)

* Saves summaries with timestamps
* Users can view up to their last 50 summaries
* Delete all history with one action
* Auto-delete summaries older than 30 days (optional)
* If history is disabled, summaries are never stored

### ⚖️ Ethical Privacy Settings

Custom ethical settings give users real control:

* **Conversation history consent** — Allows opting out of saving anything.
* **Auto-delete mode** — Summaries older than 30 days hidden and purged.
* **Transparency section** explaining:

  * What data is collected
  * Why it’s collected
  * What is not collected
  * That data is not shared or sold
* System supports **zero-retention AI endpoints**.

### 🎨 Modern UI

* Clean medical-style interface
* Light / dark / system themes
* Scrollable settings panel
* Dashboard chat experience
* Accessible layout for all device sizes

---

## 🏗️ System Architecture

```
Frontend (React)
     |
     ▼
Backend API (Express)
├── Validates Firebase ID tokens
├── Applies privacy rules
├── Calls OpenAI (zero retention)
└── Reads/writes PostgreSQL
     |
     ▼
Database (summaries + settings)

Firebase Authentication <────> Frontend
```

---

## 🗂️ Project Structure

```
clearcare/
│
├── clearcare-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── firebase/
│   │   │   └── index.jsx
│   │   └── main.jsx
│   └── vite.config.js
│
└── clearcare-backend/
    ├── src/index.js
    ├── package.json
    ├── serviceAccountKey.json
    └── .env
```

---

## 🛢️ Database Schema

### **summaries**

```sql
CREATE TABLE IF NOT EXISTS summaries (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_text TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  history_enabled BOOLEAN DEFAULT true,
  auto_delete_30_days BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚙️ Backend Endpoints

### **POST /api/summarize**

Generates a medical summary with strong safety constraints. Respects `history_enabled`.

### **GET /api/summaries**

Returns user’s history, applying auto-delete filters.

### **DELETE /api/summaries**

Deletes all summaries for the authenticated user.

### **GET /api/user-settings**

Returns user’s privacy settings.

### **PATCH /api/user-settings**

Updates settings (`history_enabled`, `auto_delete_30_days`).

### **GET /api/secure-test**

Validates auth token integration.

### **GET /api/db-test**

Verifies PostgreSQL connectivity.

---

## 🔧 Local Development Setup

### **Frontend Setup**

```
cd clearcare-frontend
npm install
npm run dev
```

Create `clearcare-frontend/.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### **Backend Setup**

```
cd clearcare-backend
npm install
node src/index.js
```

Backend `.env`:

```
OPENAI_API_KEY=...
DATABASE_URL=postgres://user:password@localhost:5432/dbname
```

Add `serviceAccountKey.json` from Firebase.

---

## 🔒 Security Design

### **Password Security**

* Firebase handles all password hashing
* Reauthentication required for changing sensitive information
* New password must be typed twice
* Prevents unauthorized account changes

### **Token-Based Authentication**

* Frontend obtains Firebase ID token
* Backend uses Firebase Admin to verify it
* No session cookies stored

### **Database Safety**

* Parameterized SQL prevents injection
* User ID validated for all DB operations

### **Responsible AI**

* No medical decisions generated
* No invented medical details
* Summary warns when details are missing
* Zero-retention design prevents AI providers from storing data

---

## ⚖️ Ethical Principles Applied

MedAssist incorporates:

### **User autonomy**

Users control whether data is saved and for how long.

### **Data minimization**

Only required fields stored; no unnecessary identifiers.

### **Transparency**

Clear breakdown of data use inside the settings page.

### **Accountability**

All AI output intentionally constrained and audit-friendly.

### **Privacy by design**

Database settings stored per-user; zero-retention AI calls.

---

## 🧪 Developer Tools

The Dashboard includes tools for verifying:

* Backend authentication
* Database connectivity
* API health

Used throughout development to debug and validate system behavior.

---

## 🚀 Future Improvements

* Individual history entry deletion
* Export conversation history (PDF/CSV)
* Full 2FA with authenticator apps
* Improved medication parsing
* Mobile-optimized UI

---

## 📄 License

This project was developed for academic use within a Computer Science course on security, ethics, and responsible AI development.
