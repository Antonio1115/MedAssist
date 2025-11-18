// src/pages/DashboardPage.jsx

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  onAuthStateChanged,
  signOut,
} from "../firebase/index.jsx";
import Layout from "../components/Layout.jsx";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi, I’m your MedAssist assistant. Paste or type your medical instructions, and I’ll help rewrite them in clear, patient-friendly language.\n\nFor example, you can send: \"Take 1 tablet of Lisinopril 10mg by mouth once daily...\"",
      createdAt: new Date().toLocaleString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  // Developer debug panels (API + DB test)
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loadingApi, setLoadingApi] = useState(false);

  const [dbStatus, setDbStatus] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [loadingDb, setLoadingDb] = useState(false);

  // Protect the route: redirect to /login if no user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate("/login");
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, [navigate]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);

    // Add user message immediately
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toLocaleString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      // Get Firebase token
      const token = await auth.currentUser.getIdToken();

      // Call backend
      const res = await fetch("http://localhost:4000/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ instructions: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to summarize");
      }

      // Backend returns { summary, saved, record }
      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.summary,
        createdAt: new Date().toLocaleString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);

      const errorMsg = {
        id: Date.now() + 2,
        role: "assistant",
        content:
          "Sorry, I couldn’t summarize those instructions right now. Please try again in a moment.",
        createdAt: new Date().toLocaleString(),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  // Developer-only: call /api/secure-test
  async function testSecureApi() {
    try {
      setLoadingApi(true);
      setApiError(null);
      setApiResult(null);

      const token = await auth.currentUser.getIdToken();

      const res = await fetch("http://localhost:4000/api/secure-test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "API error");
      }

      setApiResult(data);
    } catch (err) {
      console.error(err);
      setApiError(err.message);
    } finally {
      setLoadingApi(false);
    }
  }

  // Developer-only: call /api/db-test
  async function testDb() {
    try {
      setLoadingDb(true);
      setDbError(null);
      setDbStatus(null);

      const token = await auth.currentUser.getIdToken();

      const res = await fetch("http://localhost:4000/api/db-test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "DB error");
      }

      setDbStatus(data);
    } catch (err) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoadingDb(false);
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-gray-600">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout userName={user.displayName || user.email}>
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Chat header inside main content */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-semibold">Medical Assistance</h2>
            <p className="text-sm text-gray-600">
              Ask questions about your medical instructions or paste what your
              doctor gave you. I’ll help explain it in clearer language.
            </p>
          </div>
          <button
            className="bg-red-500 text-white py-1.5 px-4 rounded hover:bg-red-600 transition text-sm"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>

        {/* Chat container */}
        <div className="flex-1 min-h-0 bg-white border rounded-lg shadow-sm flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} className="border-t p-3">
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 border rounded-md p-2 text-sm resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder='Example: "Take 1 tablet of Lisinopril 10mg by mouth once daily in the morning. Stop if you notice severe dizziness."'
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSending || input.trim().length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
              >
                {isSending ? "Thinking..." : "Send"}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Do not use this prototype for real medical decisions.
            </div>
          </form>
        </div>

        {/* Developer tools under the chat */}
        <div className="mt-4 bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">
            Developer Tools (for testing auth & DB)
          </h3>
          <div className="flex flex-wrap gap-3 mb-3">
            <button
              className="bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700 transition text-xs disabled:opacity-60"
              onClick={testSecureApi}
              disabled={loadingApi}
            >
              {loadingApi ? "Testing API..." : "Test Secure API"}
            </button>

            <button
              className="bg-indigo-600 text-white py-1 px-3 rounded hover:bg-indigo-700 transition text-xs disabled:opacity-60"
              onClick={testDb}
              disabled={loadingDb}
            >
              {loadingDb ? "Testing DB..." : "Test DB Connection"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="border rounded p-2 bg-gray-50">
              <div className="font-semibold mb-1">Secure API Status</div>
              {!apiResult && !apiError && (
                <p className="text-gray-500">
                  Click &quot;Test Secure API&quot; to verify backend auth.
                </p>
              )}
              {apiError && (
                <p className="text-red-600">Error: {apiError}</p>
              )}
              {apiResult && (
                <div className="space-y-1 text-gray-800">
                  <p>
                    <span className="font-semibold">Message:</span>{" "}
                    {apiResult.message}
                  </p>
                  <p>
                    <span className="font-semibold">UID:</span>{" "}
                    {apiResult.uid}
                  </p>
                  {apiResult.email && (
                    <p>
                      <span className="font-semibold">Email:</span>{" "}
                      {apiResult.email}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border rounded p-2 bg-gray-50">
              <div className="font-semibold mb-1">Database Status</div>
              {!dbStatus && !dbError && (
                <p className="text-gray-500">
                  Click &quot;Test DB Connection&quot; to verify Postgres.
                </p>
              )}
              {dbError && (
                <p className="text-red-600">Error: {dbError}</p>
              )}
              {dbStatus && (
                <div className="space-y-1 text-gray-800">
                  <p>
                    <span className="font-semibold">Message:</span>{" "}
                    {dbStatus.message}
                  </p>
                  <p>
                    <span className="font-semibold">Server Time:</span>{" "}
                    {dbStatus.serverTime}
                  </p>
                  <p>
                    <span className="font-semibold">UID:</span>{" "}
                    {dbStatus.uid}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Chat bubble component
function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-xl rounded-lg px-3 py-2 text-sm whitespace-pre-wrap " +
          (isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 text-gray-900 rounded-bl-none")
        }
      >
        {message.content}
        <div className="mt-1 text-[10px] opacity-70 text-right">
          {message.createdAt}
        </div>
      </div>
    </div>
  );
}
