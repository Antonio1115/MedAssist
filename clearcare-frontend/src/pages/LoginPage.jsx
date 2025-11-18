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

  // NEW state for embedded 2FA UI
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingUser, setPendingUser] = useState(null);

  // If user is already logged in, go to dashboard
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
      let cred;

      if (mode === "signup") {
        cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Signed up:", cred.user);

        // Default new user 2FA state
        localStorage.setItem(`2fa_${cred.user.uid}`, "disabled");

        navigate("/dashboard");
        return;
      }

      // LOGIN FLOW
      cred = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", cred.user);

      const twoFAState = localStorage.getItem(`2fa_${cred.user.uid}`);
      
      if (twoFAState === "enabled") {
        // Do NOT navigate yet — show 2FA UI
        setPendingUser(cred.user);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      // If no 2FA, continue normally
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handle2FASubmit(e) {
    e.preventDefault();

    if (twoFACode.trim() !== "123456") {
      alert("Incorrect code. Demo mode uses: 123456");
      return;
    }

    // Correct 2FA code
    navigate("/dashboard");
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10">
        {!requires2FA ? (
          <>
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
              {mode === "login" ? "Need an account?" : "Already have an account?"}
            </button>
          </>
        ) : (
          // -------------------------
          // INLINE 2FA VERIFICATION UI
          // -------------------------
          <div className="border rounded p-5 shadow bg-white mt-4">
            <h2 className="text-xl font-semibold mb-2 text-center">
              Two-Factor Verification
            </h2>

            <p className="text-gray-600 text-sm mb-4 text-center">
              Enter the 6-digit verification code sent to your device.  
              <br />
              <span className="text-gray-400">(Demo code: 123456)</span>
            </p>

            <form onSubmit={handle2FASubmit} className="space-y-3">
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                className="w-full p-2 border rounded tracking-widest text-center text-lg"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
              />

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
              >
                Verify Code
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
