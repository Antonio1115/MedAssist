# MedAssist (ClearCare Prototype)

MedAssist is a prototype tool that helps patients understand their medical instructions using AI,
with a focus on privacy, safety, and ethical use of automation.

## Tech Stack

- Frontend: React (Vite), Tailwind CSS, React Router, Firebase Auth
- Backend: Node.js (Express), Firebase Admin, PostgreSQL, OpenAI API
- Auth: Firebase email/password with server-side token verification
- Database: PostgreSQL (`clearcare` DB, `summaries` table)

## Features (Current)

- User sign up / login with Firebase Authentication
- Protected routes for authenticated users
- Medical Assistance chat:
  - User pastes or types medical instructions
  - Backend calls OpenAI to generate a clear, patient-friendly explanation
  - Summaries are stored in PostgreSQL, tied to the user's Firebase UID
- Developer tools:
  - Test secure API route
  - Test database connectivity

## Security & Ethics

- All API calls require a valid Firebase ID token
- Summaries are stored per-user and never shared across accounts
- AI prompts are designed to:
  - Avoid changing doses or starting/stopping medications
  - Highlight missing information instead of guessing
  - Encourage users to confirm details with their doctor or pharmacist

## Setup (Local)

### Backend

1. Create `clearcare` PostgreSQL database and `summaries` table.
2. Create `clearcare-backend/.env` from `.env.example` and fill in:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
3. Place `serviceAccountKey.json` from Firebase in `clearcare-backend/`.
4. Install dependencies and start:
   ```bash
   cd clearcare-backend
   npm install
   npm start
