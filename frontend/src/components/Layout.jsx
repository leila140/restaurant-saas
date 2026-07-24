import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = {
  owner: [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/dashboard/menu", label: "Menu", icon: "🍽️" },
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/tables", label: "Tables", icon: "🪑" },
    { to: "/dashboard/reservations", label: "Réservations", icon: "📅" },
  ],
  manager: [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/tables", label: "Tables", icon: "🪑" },
    { to: "/dashboard/reservations", label: "Réservations", icon: "📅" },
  ],
  kitchen: [
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
  ],
  server: [
    { to: "/dashboard/orders", label: "Commandes", icon: "📋" },
    { to: "/dashboard/tables", label: "Tables", icon: "🪑" },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const items = navItems[user?.role] || [];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">Restaurant SaaS</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 capitalize">
            {user?.role}
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
