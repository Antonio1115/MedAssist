import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase/index.jsx";
import Layout from "../components/Layout.jsx";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setUser(u);
    });
    return () => unsub();
  }, [navigate]);

  if (!user) {
    return (
      <Layout>
        <div className="text-gray-600">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout userEmail={user.email}>
      <h2 className="text-2xl font-semibold mb-2">Conversation History</h2>
      <p className="text-gray-600 text-sm mb-4">
        This page will later show a history of your past summaries and
        conversations with the assistant.
      </p>
      <div className="text-sm text-gray-500">
        For now, this is just a placeholder so you can show navigation working
        in your demo.
      </div>
    </Layout>
  );
}
