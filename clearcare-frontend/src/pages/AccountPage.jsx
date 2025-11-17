import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, signOut } from "../firebase/index.jsx";
import Layout from "../components/Layout.jsx";

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setUser(u);
    });
    return () => unsub();
  }, [navigate]);

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
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
        This page will later let users manage password, 2FA, and data privacy
        (like deleting all summaries or exporting their data).
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="border rounded p-3 bg-white shadow-sm">
          <h3 className="font-semibold mb-1">Sign-in Email</h3>
          <p className="text-gray-700">{user.email}</p>
        </div>

        <div className="border rounded p-3 bg-white shadow-sm">
          <h3 className="font-semibold mb-2">Security Actions</h3>
          <button
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition text-sm"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </Layout>
  );
}
