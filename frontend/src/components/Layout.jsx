import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = {
  owner: [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/dashboard/menu", label: "Menu", icon: "🍽️" },
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/kitchen", label: "Cuisine", icon: "🍳" },
    { to: "/dashboard/tables", label: "Tables", icon: "🪑" },
    { to: "/dashboard/reservations", label: "Réservations", icon: "📅" },
    { to: "/dashboard/staff", label: "Équipe", icon: "👥" },
    { to: "/dashboard/settings", label: "Réglages", icon: "⚙️" },
  ],
  manager: [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/kitchen", label: "Cuisine", icon: "🍳" },
    { to: "/dashboard/tables", label: "Tables", icon: "🪑" },
    { to: "/dashboard/reservations", label: "Réservations", icon: "📅" },
  ],
  kitchen: [
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/kitchen", label: "Cuisine", icon: "🍳" },
  ],
  server: [
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/tables", label: "Tables", icon: "🪑" },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const items = navItems[user?.role] || [];
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`
          w-64 bg-white shadow-md flex flex-col shrink-0
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-emerald-700">Restaurant SaaS</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 capitalize">
              {user?.role}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-gray-500 text-2xl leading-none ml-2"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden bg-white shadow-sm px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-600 text-xl"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-800">Restaurant SaaS</span>
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
