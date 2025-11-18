import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, signOut } from "../firebase/index.jsx";
import Layout from "../components/Layout.jsx";

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else {
        setUser(u);

        // Load dummy 2FA state from localStorage
        const stored = localStorage.getItem(`2fa_${u.uid}`);
        setTwoFAEnabled(stored === "enabled");
      }
    });
    return () => unsub();
  }, [navigate]);

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  function handleToggle2FA() {
    if (!user) return;

    const newState = !twoFAEnabled;
    setTwoFAEnabled(newState);

    // Persist dummy 2FA setting
    localStorage.setItem(`2fa_${user.uid}`, newState ? "enabled" : "disabled");

    alert(
      newState
        ? "Your dummy 2FA has been enabled.\n(For demo use only.)"
        : "2FA disabled."
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-gray-600">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout userEmail={user.email}>
      <h2 className="text-2xl font-semibold mb-2">Account & Security</h2>
      <p className="text-gray-600 text-sm mb-4">
        Manage your email, security settings, and 2FA.
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="border rounded p-3 bg-white shadow-sm">
          <h3 className="font-semibold mb-1">Sign-in Email</h3>
          <p className="text-gray-700">{user.email}</p>
        </div>

        <div className="border rounded p-3 bg-white shadow-sm">
          <h3 className="font-semibold mb-2">Security Actions</h3>

          <button
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition text-sm mr-2"
            onClick={handleSignOut}
          >
            Sign Out
          </button>

          <button
            className={`${
              twoFAEnabled ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-500 hover:bg-green-600"
            } text-white py-2 px-4 rounded transition text-sm`}
            onClick={handleToggle2FA}
          >
            {twoFAEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
