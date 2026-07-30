import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  const today = new Date().toISOString().split("T")[0];

  const { data: ordersToday = [] } = useQuery({
    queryKey: ["orders", restaurantId, "today"],
    queryFn: () =>
      api.get("/orders", { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
    refetchInterval: 15000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", restaurantId],
    queryFn: () =>
      api.get("/orders", { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const { data: popularReviews = [] } = useQuery({
    queryKey: ["reviews", "popular", restaurantId],
    queryFn: () => api.get(`/reviews/popular/${restaurantId}`).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const allOrders = orders || [];
  const todayOrders = allOrders.filter((o) => {
    const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
    return orderDate === today && o.status !== "cancelled";
  });

  const totalSales = todayOrders
    .filter((o) => o.status === "paid" || o.status === "served")
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const paidCount = todayOrders.filter((o) => o.status === "paid").length;
  const pendingCount = todayOrders.filter(
    (o) => o.status === "pending" || o.status === "preparing"
  ).length;
  const readyCount = todayOrders.filter((o) => o.status === "ready").length;

  // Popular items
  const itemCounts = {};
  allOrders.forEach((order) => {
    order.items?.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });
  const popularItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Avg prep time
  const prepTimes = allOrders
    .filter((o) => o.status !== "pending" && o.status !== "cancelled")
    .map((o) => {
      const created = new Date(o.createdAt);
      const updated = new Date(o.updatedAt);
      return (updated - created) / 60000;
    })
    .filter((t) => t > 0);

  const avgPrepTime =
    prepTimes.length > 0
      ? (prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length).toFixed(1)
      : "—";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">Ventes du jour</p>
          <p className="text-2xl font-bold text-gray-800">
            {totalSales.toFixed(2)} €
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">Commandes payées</p>
          <p className="text-2xl font-bold text-green-600">{paidCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">En attente / prépa</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">Prêtes à servir</p>
          <p className="text-2xl font-bold text-green-600">{readyCount}</p>
        </div>
      </div>

      {/* Popular items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            Plats les plus commandés
          </h2>{popularItems.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune donnée</p>
          ) : (
            <div className="space-y-2">
              {popularItems.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-gray-700">{name}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {count}
                    </span>
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full"
                      style={{
                        width: `${Math.min(
                          (count / Math.max(...popularItems.map(([, c]) => c))) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            ⭐ Meilleures notes clients
          </h2>
          {popularReviews.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun avis pour le moment</p>
          ) : (
            <div className="space-y-3">
              {popularReviews.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-yellow-400 text-sm">
                        {"★".repeat(Math.round(item.avgRating))}
                        {"☆".repeat(5 - Math.round(item.avgRating))}
                      </span>
                      <span className="text-xs font-semibold text-gray-600">
                        {item.avgRating}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({item.count} avis)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            Temps de préparation moyen
          </h2>
          <p className="text-3xl font-bold text-gray-800">
            {avgPrepTime !== "—" ? `${avgPrepTime} min` : "—"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Basé sur {prepTimes.length} commande{prepTimes.length > 1 ? "s" : ""}{" "}
            traitées
          </p>

          <h3 className="font-semibold text-gray-700 mt-6 mb-3">
            Dernières commandes
          </h3>
          <div className="space-y-2">
            {allOrders.slice(0, 5).map((order) => (
              <div
                key={order._id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">
                  Table {order.tableId?.number || "?"} —{" "}
                  {new Date(order.createdAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-medium">
                  {order.totalPrice?.toFixed(2)} €
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === "paid"
                      ? "bg-green-100 text-green-700"
                      : order.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            ))}
            {allOrders.length === 0 && (
              <p className="text-gray-400 text-sm">Aucune commande</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
