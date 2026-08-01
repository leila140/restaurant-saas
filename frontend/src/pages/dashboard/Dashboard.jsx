import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../../components/EmptyState";
import Skeleton, { SkeletonCard } from "../../components/Skeleton";
import BarChart from "../../components/BarChart";

const PERIODS = [
  { days: 1, label: "Aujourd'hui" },
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
];

const statusLabels = {
  pending: "En attente",
  preparing: "En préparation",
  ready: "Prêt",
  served: "Servi",
  paid: "Payé",
  cancelled: "Annulé",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  served: "bg-gray-100 text-gray-600",
  paid: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

const formatDay = (dateStr) => {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const [days, setDays] = useState(1);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["orders-stats", restaurantId, days],
    queryFn: () =>
      api.get("/orders/stats", { params: { days } }).then((r) => r.data),
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  const { data: popularReviews = [] } = useQuery({
    queryKey: ["reviews", "popular", restaurantId],
    queryFn: () =>
      api.get(`/reviews/popular/${restaurantId}`).then((r) => r.data),
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  const kpis = [
    {
      label: "Chiffre d'affaires",
      value: `${(stats?.totalRevenue ?? 0).toFixed(2)} €`,
      accent: "border-l-emerald-500",
    },
    {
      label: "Commandes",
      value: stats?.totalOrders ?? 0,
      accent: "border-l-teal-500",
    },
    {
      label: "Panier moyen",
      value: `${(stats?.avgOrderValue ?? 0).toFixed(2)} €`,
      accent: "border-l-emerald-400",
    },
    {
      label: "Temps de prépa moyen",
      value: stats?.avgPrepTime ? `${stats.avgPrepTime} min` : "—",
      accent: "border-l-stone-400",
    },
  ];

  const chartData =
    days > 1 && stats?.revenueByDay?.length
      ? stats.revenueByDay.map((d) => ({
          label: formatDay(d.date),
          value: d.revenue,
        }))
      : [];

  const statusChips = stats?.statusCounts
    ? Object.entries(stats.statusCounts).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-emerald-700">Dashboard</h1>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                days === p.days
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${kpi.accent}`}
          >
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Status chips */}
      {!isLoading && statusChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {statusChips.map(([key, count]) => (
            <span
              key={key}
              className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[key]}`}
            >
              {statusLabels[key]} · {count}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {/* Revenue chart */}
        {days > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-4">
              Chiffre d'affaires par jour
            </h2>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : chartData.length === 0 ? (
              <EmptyState icon="📊" title="Aucune donnée sur cette période" />
            ) : (
              <BarChart data={chartData} />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top items */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-3">
              Plats les plus commandés
            </h2>
            {isLoading ? (
              <SkeletonCard />
            ) : !stats?.topItems?.length ? (
              <EmptyState icon="🍽️" title="Aucune donnée" />
            ) : (
              <div className="space-y-2">
                {stats.topItems.map((item, i) => {
                  const max = Math.max(...stats.topItems.map((t) => t.quantity));
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-5">{i + 1}</span>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-700 truncate">
                          {item.name}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(item.quantity / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue by category */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-3">
              Chiffre d'affaires par catégorie
            </h2>
            {isLoading ? (
              <SkeletonCard />
            ) : !stats?.revenueByCategory?.length ? (
              <EmptyState icon="🗂️" title="Aucune donnée" />
            ) : (
              <div className="space-y-2">
                {stats.revenueByCategory.map((cat) => {
                  const max = Math.max(
                    ...stats.revenueByCategory.map((c) => c.revenue)
                  );
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 truncate">{cat.name}</span>
                          <span className="font-semibold text-gray-800 ml-2">
                            {cat.revenue.toFixed(2)} €
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${(cat.revenue / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top reviews */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-3">
              ⭐ Meilleures notes clients
            </h2>
            {popularReviews.length === 0 ? (
              <EmptyState icon="⭐" title="Aucun avis pour le moment" />
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
        </div>
      </div>
    </div>
  );
}
