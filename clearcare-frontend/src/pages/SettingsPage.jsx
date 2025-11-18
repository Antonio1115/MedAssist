// clearcare-frontend/src/pages/SettingsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";

import { auth } from "../firebase/index.jsx";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

function SettingsPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Theme
  const [theme, setTheme] = useState("system");

  // Privacy
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [autoDelete30, setAutoDelete30] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [clearingHistory, setClearingHistory] = useState(false);

  // Security (dummy 2FA)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFAEnteringCode, setTwoFAEnteringCode] = useState(false); // controls modal visibility
  const [twoFACodeInput, setTwoFACodeInput] = useState("");

  // -------------------- THEME APPLY --------------------
  function applyTheme(newTheme) {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    root.classList.remove("dark");

    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "system") {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      if (prefersDark) root.classList.add("dark");
    }
  }

  // -------------------- LOAD USER + SETTINGS --------------------
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      setUser(firebaseUser);
      setDisplayName(firebaseUser.displayName || "");
      setEmail(firebaseUser.email || "");

      // theme
      const storedTheme = localStorage.getItem("theme");
      applyTheme(storedTheme || "system");

      // mock 2FA
      const stored2FA = localStorage.getItem(`2fa_${firebaseUser.uid}`);
      setTwoFAEnabled(stored2FA === "enabled");

      // Load backend settings
      try {
        const token = await firebaseUser.getIdToken();

        const res = await fetch("http://localhost:4000/api/user-settings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch settings");

        const data = await res.json();

        setHistoryEnabled(data.settings.history_enabled);
        setAutoDelete30(data.settings.auto_delete_30_days);
      } catch (err) {
        console.error(err);
        setSettingsError("Could not load your privacy settings.");
      } finally {
        setSettingsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // -------------------- PROFILE SAVE --------------------
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!user) return;

    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

    try {
      if (displayName !== (user.displayName || "")) {
        await updateProfile(user, { displayName });
      }

      if (email !== (user.email || "")) {
        await updateEmail(user, email);
      }

      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setProfileError("Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  // -------------------- PASSWORD CHANGE --------------------
  async function handleChangePassword(e) {
    e.preventDefault();
    if (!user) return;

    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill out all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword.trim());

      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setPasswordError(
        "Failed to change password. Please make sure your current password is correct."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  // -------------------- BACKEND SETTINGS --------------------
  async function updateBackendSettings(newSettings) {
    if (!user) return;
    setSettingsError("");
    setSettingsMessage("");

    try {
      const token = await user.getIdToken();

      const res = await fetch("http://localhost:4000/api/user-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) throw new Error("Failed to update");

      const data = await res.json();

      setHistoryEnabled(data.settings.history_enabled);
      setAutoDelete30(data.settings.auto_delete_30_days);
      setSettingsMessage("Privacy settings updated.");
    } catch (err) {
      console.error(err);
      setSettingsError("Failed to update privacy settings.");
    }
  }

  function handleToggleHistory(e) {
    updateBackendSettings({ history_enabled: e.target.checked });
  }

  function handleToggleAutoDelete(e) {
    updateBackendSettings({ auto_delete_30_days: e.target.checked });
  }

  // -------------------- CLEAR HISTORY --------------------
  async function handleClearHistory() {
    if (!user) return;
    if (!window.confirm("Delete ALL conversation history?")) return;

    setClearingHistory(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const token = await user.getIdToken();

      const res = await fetch("http://localhost:4000/api/summaries", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed delete");

      const data = await res.json();
      setSettingsMessage(`Deleted ${data.deleted_count} records.`);
    } catch (err) {
      console.error(err);
      setSettingsError("Failed to clear history.");
    } finally {
      setClearingHistory(false);
    }
  }

  // -------------------- 2FA (dummy code flow with modal) --------------------
  function startEnable2FA() {
    if (!user) return;
    setTwoFAError("");
    setTwoFAMessage("");
    setTwoFAEnteringCode(true); // open modal
    setTwoFACodeInput("");
  }

  function cancel2FASetup() {
    setTwoFAEnteringCode(false); // close modal
    setTwoFACodeInput("");
    setTwoFAError("");
  }

  function submit2FACode(e) {
    e.preventDefault();
    setTwoFAError("");
    setTwoFAMessage("");

    if (twoFACodeInput.trim() === "123456") {
      setTwoFAEnabled(true);
      localStorage.setItem(`2fa_${user.uid}`, "enabled");
      setTwoFAEnteringCode(false); // close modal
      setTwoFACodeInput("");
      setTwoFAMessage("Two-factor authentication enabled for this demo account.");
      setTimeout(() => setTwoFAMessage(""), 4000);
    } else {
      setTwoFAError("Incorrect code. For this demo, use 123456.");
    }
  }

  function disable2FA() {
    if (!user) return;
    setTwoFAEnabled(false);
    localStorage.setItem(`2fa_${user.uid}`, "disabled");
    setTwoFAMessage("Two-factor authentication disabled.");
    setTwoFAError("");
    setTwoFAEnteringCode(false);
    setTwoFACodeInput("");
    setTimeout(() => setTwoFAMessage(""), 4000);
  }

  // -------------------- SIGN OUT --------------------
  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  // -------------------- RENDER --------------------
  if (!user) {
    return (
      <Layout>
        <div className="text-gray-600">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout userName={user.displayName || user.email}>
      <div className="h-[calc(100vh-5rem)] overflow-y-auto pr-2 relative">
        <div className="space-y-8 pb-4">
          <h1 className="text-2xl font-semibold mb-2">Settings</h1>

          {/* Global messages */}
          {twoFAMessage && (
            <div className="bg-green-100 text-green-700 text-sm px-3 py-2 rounded-md border border-green-300">
              {twoFAMessage}
            </div>
          )}
          {twoFAError && !twoFAEnteringCode && (
            <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded-md border border-red-300">
              {twoFAError}
            </div>
          )}

          {/* Profile */}
          <section className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold">Profile Settings</h2>

            <form className="space-y-4 max-w-md" onSubmit={handleSaveProfile}>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  type="text"
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              {profileError && (
                <div className="text-red-600 text-sm">{profileError}</div>
              )}
              {profileMessage && (
                <div className="text-green-600 text-sm">{profileMessage}</div>
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
              >
                {profileSaving ? "Saving…" : "Save profile"}
              </button>
            </form>
          </section>

          {/* Account & Security */}
          <section className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold">Account & Security</h2>

            <div>
              <h3 className="font-medium text-sm">Sign-in Email</h3>
              <p className="text-gray-700">{user.email}</p>
            </div>

            {/* Dummy 2FA controls */}
            <div className="mt-2 space-y-2">
              <h3 className="font-medium text-sm">Two-Factor Authentication (Demo)</h3>

              {!twoFAEnabled && (
                <>
                  <p className="text-xs text-gray-600">
                    Add an extra layer of security with a 6-digit verification
                    code sent to your email (demo only).
                  </p>
                  <button
                    onClick={startEnable2FA}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition text-sm"
                  >
                    Enable 2FA
                  </button>
                </>
              )}

              {twoFAEnabled && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    Two-factor authentication is enabled for this demo account.
                    On a real system, you would be asked for a 6-digit code at sign-in.
                  </p>
                  <button
                    onClick={disable2FA}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded transition text-sm"
                  >
                    Disable 2FA
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition text-sm"
            >
              Sign Out
            </button>

            {/* Password change form */}
            <div className="pt-4 border-t mt-4">
              <h3 className="font-medium text-sm mb-2">Change password</h3>
              <form
                className="space-y-3 max-w-md"
                onSubmit={handleChangePassword}
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                {passwordError && (
                  <div className="text-sm text-red-600">{passwordError}</div>
                )}
                {passwordMessage && (
                  <div className="text-sm text-green-600">
                    {passwordMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
                >
                  {passwordSaving ? "Updating…" : "Update password"}
                </button>
              </form>
            </div>
          </section>

          {/* Theme */}
          <section className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold">App Theme</h2>

            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                name="theme"
                checked={theme === "light"}
                onChange={() => applyTheme("light")}
              />
              Light
            </label>

            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                name="theme"
                checked={theme === "dark"}
                onChange={() => applyTheme("dark")}
              />
              Dark
            </label>

            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                name="theme"
                checked={theme === "system"}
                onChange={() => applyTheme("system")}
              />
              System default
            </label>
          </section>

          {/* Privacy */}
          <section className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold">Privacy & Data Controls</h2>

            {settingsLoading && (
              <div className="text-sm text-gray-600">
                Loading privacy settings...
              </div>
            )}

            {settingsError && (
              <div className="text-sm text-red-600">{settingsError}</div>
            )}

            {settingsMessage && (
              <div className="text-sm text-green-600">{settingsMessage}</div>
            )}

            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={handleToggleHistory}
              />
              Allow conversation history
            </label>

            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoDelete30}
                onChange={handleToggleAutoDelete}
              />
              Auto-delete history older than 30 days
            </label>

            <button
              onClick={handleClearHistory}
              disabled={clearingHistory}
              className="text-red-600 text-xs border border-red-500 px-3 py-1 rounded-md"
            >
              {clearingHistory ? "Clearing…" : "Clear all history"}
            </button>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-sm">How your data is used</h3>
              <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                <li>Your email and messages are stored securely.</li>
                <li>Passwords are handled safely by Firebase.</li>
                <li>No data is sold or shared.</li>
              </ul>
            </div>
          </section>
        </div>

        {/* 2FA MODAL */}
        {twoFAEnteringCode && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 mx-4">
              <h2 className="text-lg font-semibold mb-2">
                Enter verification code
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                We sent a 6-digit verification code to your email address.
                Enter it below to finish setting up two-factor authentication.
                (Demo code: 123456)
              </p>

              {twoFAError && (
                <div className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md mb-2 border border-red-200">
                  {twoFAError}
                </div>
              )}

              <form onSubmit={submit2FACode} className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFACodeInput}
                  onChange={(e) => setTwoFACodeInput(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-center tracking-widest text-sm"
                  placeholder="123456"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancel2FASetup}
                    className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Verify code
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default SettingsPage;
