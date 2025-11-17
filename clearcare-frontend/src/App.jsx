// src/App.jsx

import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md border">
        
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
          MedAssist Prototype
        </h1>

        <p className="text-gray-600 text-center mb-6">
          Choose a page while developing the prototype:
        </p>

        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Login / Sign Up
          </Link>

          <Link
            to="/dashboard"
            className="block w-full text-center bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Go to Medical Assistance (Dashboard)
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Prototype only — not for real medical use
        </p>
      </div>
    </div>
  );
}
