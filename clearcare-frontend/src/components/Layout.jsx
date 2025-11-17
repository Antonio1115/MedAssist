// src/components/Layout.jsx
import { NavLink } from "react-router-dom";

export default function Layout({ children, userEmail }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="w-full bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            M
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">MedAssist</h1>
            <p className="text-xs text-gray-500">
              Clearer medical instructions, safer patients.
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-700">
          {userEmail ? (
            <>
              <span className="text-gray-500 mr-1">Signed in as</span>
              <span className="font-medium">{userEmail}</span>
            </>
          ) : (
            <span className="text-gray-500">Not signed in</span>
          )}
        </div>
      </header>

      {/* Main area: sidebar + content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r py-4 px-3">
          <nav className="space-y-1 text-sm">
            <SidebarItem label="Medical Assistance" to="/dashboard" />
            <SidebarItem label="Conversation History" to="/history" />
            <SidebarItem label="Settings" to="/settings" />
            <SidebarItem label="Account & Security" to="/account" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
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
          ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
          : "text-gray-700 hover:bg-gray-50")
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}
