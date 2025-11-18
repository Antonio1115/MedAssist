// src/components/Layout.jsx
import { NavLink } from "react-router-dom";

export default function Layout({ children, userName }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="w-full bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            M
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              MedAssist
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clearer medical instructions, safer patients.
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-200">
          {userName ? (
            <>
              <span className="text-gray-500 dark:text-gray-400 mr-1">
                Signed in as
              </span>
              <span className="font-medium">{userName}</span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              Not signed in
            </span>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-white dark:bg-gray-800 border-r dark:border-gray-700 py-4 px-3">
          <nav className="space-y-1 text-sm">
            <SidebarItem label="Medical Assistance" to="/dashboard" />
            <SidebarItem label="Conversation History" to="/history" />
            <SidebarItem label="Settings" to="/settings" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ label, to }) {
  const base =
    "flex items-center px-3 py-2 rounded-md cursor-pointer transition ";

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        base +
        (isActive
          ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-700"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}
