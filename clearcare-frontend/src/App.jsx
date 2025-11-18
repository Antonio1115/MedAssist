import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-10 w-full max-w-md border">
        
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">
          MedAssist
        </h1>

        <p className="text-gray-600 text-center mb-8 leading-relaxed">
          Your personal medical instruction assistant.  
          Summaries, dosage guidance, and interaction insights. All in one place.
        </p>

        <Link
          to="/login"
          className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Get Started
        </Link>

      </div>
    </div>
  );
}
