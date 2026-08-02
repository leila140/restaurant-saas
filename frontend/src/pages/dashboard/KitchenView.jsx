import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../context/AuthContext";
import { playNewOrderSound } from "../../utils/sound";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";

const timeAgo = (iso) => {
  const m = Math.floor(
    Math.max(0, Date.now() - new Date(iso).getTime()) / 60000
  );
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h ${m % 60} min`;
};

export default function KitchenView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId;
  const { on, off } = useSocket(restaurantId);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("kitchenSoundEnabled") !== "0"
  );

  useEffect(() => {
    localStorage.setItem("kitchenSoundEnabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", restaurantId],
    queryFn: () =>
      api.get("/orders", { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
    refetchInterval: 15000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onError: () => toast.error("Erreur lors du changement de statut"),
  });

  useEffect(() => {
    if (!on || !off) return;

    const refresh = () => {
      queryClient.invalidateQueries(["orders", restaurantId]);
      queryClient.invalidateQueries(["orders", restaurantId, "bills"]);
    };
    const handleNewOrder = () => {
      if (soundEnabled) playNewOrderSound();
      refresh();
    };

    on("order:new", handleNewOrder);
    on("order:statusChanged", refresh);

    return () => {
      off("order:new", handleNewOrder);
      off("order:statusChanged", refresh);
    };
  }, [on, off, restaurantId, queryClient, soundEnabled]);

  const kitchenOrders = (orders || []).filter((o) =>
    ["pending", "preparing"].includes(o.status)
  );
  const toPrepare = kitchenOrders.filter((o) => o.status === "pending");
  const preparing = kitchenOrders.filter((o) => o.status === "preparing");

  const renderCard = (order, nextLabel, nextStatus, color) => (
    <div
      key={order._id}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-800">
            T{order.tableId?.number ?? "?"}
          </span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              order.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {order.status === "pending" ? "À préparer" : "En préparation"}
          </span>
        </div>
        <span
          className={`text-xs font-semibold ${
            Date.now() - new Date(order.createdAt).getTime() > 10 * 60000
              ? "text-red-600"
              : "text-gray-400"
          }`}
        >
          {timeAgo(order.createdAt)}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 mb-4">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-lg">
            <span className="font-semibold text-gray-800 w-8">
              {item.quantity}x
            </span>
            <div>
              <span className="text-gray-800">{item.name}</span>
              {item.notes && (
                <span className="block text-sm text-orange-600 italic mt-0.5">
                  ⚠️ {item.notes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          statusMutation.mutate({ id: order._id, status: nextStatus })
        }
        disabled={statusMutation.isPending}
        className={`w-full py-3.5 rounded-xl text-white text-lg font-semibold transition-colors disabled:opacity-50 ${
          color === "blue" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {nextLabel}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">🍳 Écran cuisine</h1>
          <span className="text-sm text-gray-400">
            {kitchenOrders.length} commande(s) en cours
          </span>
        </div>
        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            soundEnabled
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          🔔 {soundEnabled ? "Son activé" : "Son coupé"}
        </button>
      </div>

      {kitchenOrders.length === 0 ? (
        <EmptyState
          icon="🍳"
          title="Cuisine au calme"
          subtitle="Les nouvelles commandes apparaîtront ici en temps réel"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              À préparer ({toPrepare.length})
            </h2>
            <div className="space-y-3">
              {toPrepare.map((o) =>
                renderCard(o, "▶ En préparation", "preparing", "blue")
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              En préparation ({preparing.length})
            </h2>
            <div className="space-y-3">
              {preparing.map((o) => renderCard(o, "✅ Prêt", "ready", "green"))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
