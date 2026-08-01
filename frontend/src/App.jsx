import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import MenuView from "./pages/public/MenuView";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import MenuManager from "./pages/dashboard/MenuManager";
import OrdersView from "./pages/dashboard/OrdersView";
import TablesView from "./pages/dashboard/TablesView";
import ReservationsView from "./pages/dashboard/ReservationsView";
import StaffManager from "./pages/dashboard/StaffManager";
import Settings from "./pages/dashboard/Settings";

const queryClient = new QueryClient();

function HomeRedirect() {
  const user = JSON.parse(localStorage.getItem("user"));
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            {/* Public routes — table route must come before generic slug route */}
            <Route path="/r/:slug/table/:token" element={<MenuView />} />
            <Route path="/r/:slug" element={<MenuView />} />

            {/* Root redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard (protected) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route
                path="menu"
                element={
                  <ProtectedRoute allowedRoles={["owner"]}>
                    <MenuManager />
                  </ProtectedRoute>
                }
              />
              <Route path="orders" element={<OrdersView />} />
              <Route path="tables" element={<TablesView />} />
              <Route path="reservations" element={<ReservationsView />} />
              <Route
                path="staff"
                element={
                  <ProtectedRoute allowedRoles={["owner"]}>
                    <StaffManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={["owner"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                  <h1 className="text-6xl font-bold text-emerald-600 mb-2">404</h1>
                  <p className="text-gray-500 mb-6">Page introuvable</p>
                  <Link to="/" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">
                    Retour à l'accueil
                  </Link>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
