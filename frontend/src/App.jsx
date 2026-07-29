import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import MenuView from "./pages/public/MenuView";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import MenuManager from "./pages/dashboard/MenuManager";
import OrdersView from "./pages/dashboard/OrdersView";
import TablesView from "./pages/dashboard/TablesView";
import ReservationsView from "./pages/dashboard/ReservationsView";

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
          <Routes>
            {/* Public routes — table route must come before generic slug route */}
            <Route path="/r/:slug/table/:token" element={<MenuView />} />
            <Route path="/r/:slug" element={<MenuView />} />

            {/* Root redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />

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
            </Route>

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <h1 className="text-4xl font-bold text-gray-300">404</h1>
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
