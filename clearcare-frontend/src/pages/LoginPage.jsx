import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "../firebase/index.jsx";
import Layout from "../components/Layout.jsx";
export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If user is already logged in, send them to dashboard immediately
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });
    return () => unsub();
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Signed up:", cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in:", cred.user);
      }

      // After successful login/signup, go to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

   return (
    <Layout>
      <div className="max-w-md mx-auto mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === "login" ? "Login" : "Create Account"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading
              ? "Working..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        <button
          onClick={() =>
            setMode((m) => (m === "login" ? "signup" : "login"))
          }
          className="mt-4 text-blue-600 underline"
        >
          {mode === "login"
            ? "Need an account?"
            : "Already have an account?"}
        </button>
      </div>
    </Layout>
  );
}