import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../context/AuthContext";
import { playNewOrderSound } from "../../utils/sound";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";

const statusColors = {
  pending: "bg-yellow-100 border-yellow-300 text-yellow-800",
  preparing: "bg-blue-100 border-blue-300 text-blue-800",
  ready: "bg-green-100 border-green-300 text-green-800",
  served: "bg-gray-100 border-gray-300 text-gray-600",
  paid: "bg-gray-100 border-gray-300 text-gray-400",
  cancelled: "bg-red-100 border-red-300 text-red-800",
};

const statusLabels = {
  pending: "En attente",
  preparing: "En préparation",
  ready: "Prêt",
  served: "Servi",
  paid: "Payé",
  cancelled: "Annulé",
};

const roleFilters = {
  kitchen: ["pending", "preparing"],
  server: ["ready", "served"],
  owner: null,
  manager: null,
};

const roleActions = {
  kitchen: {
    pending: "preparing",
    preparing: "ready",
  },
  server: {
    ready: "served",
    served: "paid",
  },
  owner: {
    pending: "preparing",
    preparing: "ready",
    ready: "served",
    served: "paid",
  },
  manager: {
    pending: "preparing",
    preparing: "ready",
    ready: "served",
    served: "paid",
  },
};

export default function OrdersView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId;
  const role = user?.role;
  const { on, off } = useSocket(restaurantId);
  const [filterStatus, setFilterStatus] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("kitchenSoundEnabled") !== "0"
  );

  useEffect(() => {
    localStorage.setItem("kitchenSoundEnabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  const allowedStatuses = roleFilters[role] || null;
  const actions = roleActions[role] || {};

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", restaurantId, filterStatus],
    queryFn: () => {
      const params = { restaurantId };
      if (filterStatus) params.status = filterStatus;
      return api.get("/orders", { params }).then((r) => r.data);
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["orders", restaurantId]);
      const labels = { preparing: "En préparation", ready: "Prêt", served: "Servi", paid: "Payé", cancelled: "Annulé" };
      toast.success(`Statut mis à jour : ${labels[variables.status] || variables.status}`);
    },
    onError: () => toast.error("Erreur lors du changement de statut"),
  });

  useEffect(() => {
    if (!on || !off) return;

    const handleNewOrder = () => {
      if (soundEnabled) playNewOrderSound();
      queryClient.invalidateQueries(["orders", restaurantId]);
    };

    const handleStatusChanged = () => {
      queryClient.invalidateQueries(["orders", restaurantId]);
    };

    on("order:new", handleNewOrder);
    on("order:statusChanged", handleStatusChanged);

    return () => {
      off("order:new", handleNewOrder);
      off("order:statusChanged", handleStatusChanged);
    };
  }, [on, off, restaurantId, queryClient, soundEnabled]);

  const filteredOrders = (orders || []).filter((order) => {
    if (allowedStatuses) return allowedStatuses.includes(order.status);
    return true;
  });

  const kitchenOrders = ["pending", "preparing"];
  const readyOrders = ["ready"];
  const servedOrders = ["served", "paid", "cancelled"];

  const grouped = {
    kitchen: filteredOrders.filter((o) => kitchenOrders.includes(o.status)),
    ready: filteredOrders.filter((o) => readyOrders.includes(o.status)),
    served: filteredOrders.filter((o) => servedOrders.includes(o.status)),
  };

  const renderOrderCard = (order) => (
    <div
      key={order._id}
      className={`rounded-xl border-2 p-4 hover:shadow-md transition-shadow ${
        statusColors[order.status] || "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lg">
          Table {order.tableId?.number || "?"}
        </span>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/80">
          {statusLabels[order.status]}
        </span>
      </div>
      <div className="space-y-1 mb-3">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {item.quantity}x {item.name}
              {item.notes && (
                <span className="text-gray-500 italic ml-1">({item.notes})</span>
              )}
            </span>
            <span className="font-medium">
              {(item.price * item.quantity).toFixed(2)} €
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {new Date(order.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex gap-2">
          {order.status !== "paid" && order.status !== "cancelled" && (
            <>
              {order.status === "pending" && actions.pending && (
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      id: order._id,
                      status: actions.pending,
                    })
                  }
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  En préparation
                </button>
              )}
              {order.status === "preparing" && actions.preparing && (
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      id: order._id,
                      status: actions.preparing,
                    })
                  }
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                >
                  Prêt
                </button>
              )}
              {order.status === "ready" && actions.ready && (
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      id: order._id,
                      status: actions.ready,
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                >
                  Servi
                </button>
              )}
              {order.status === "served" && actions.served && (
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      id: order._id,
                      status: actions.served,
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                >
                  Payer
                </button>
              )}
              {role === "owner" && order.status !== "cancelled" && (
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      id: order._id,
                      status: "cancelled",
                    })
                  }
                  className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200"
                >
                  Annuler
                </button>
              )}
            </>
          )}
          {order.status === "paid" && (
            <span className="text-xs text-gray-400 italic">Payé</span>
          )}
          {order.status === "cancelled" && (
            <span className="text-xs text-red-400 italic">Annulé</span>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Commandes</h1>
        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          title="Son de notification nouvelle commande"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            soundEnabled
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          🔔 {soundEnabled ? "Son activé" : "Son coupé"}
        </button>
        <div className="flex gap-2 text-sm flex-wrap">
          {allowedStatuses ? (
            allowedStatuses.map((s) => (
              <span
                key={s}
                className={`px-3 py-1 rounded-full ${
                  statusColors[s]
                } bg-opacity-50`}
              >
                {statusLabels[s]}
              </span>
            ))
          ) : (
            <>
              <button
                onClick={() => setFilterStatus(null)}
                className={`px-3 py-1 rounded-full ${
                  !filterStatus
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                Toutes
              </button>
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1 rounded-full ${
                    filterStatus === key
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {role !== "server" && grouped.kitchen.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              🍳 En cuisine ({grouped.kitchen.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped.kitchen.map(renderOrderCard)}
            </div>
          </div>
        )}

        {grouped.ready.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              ✅ Prêtes à servir ({grouped.ready.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped.ready.map(renderOrderCard)}
            </div>
          </div>
        )}

        {role !== "kitchen" && grouped.served.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-500 mb-3">
              📋 Servies / Payées ({grouped.served.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped.served.map(renderOrderCard)}
            </div>
          </div>
        )}

        {filteredOrders.length === 0 && (
          <EmptyState
            icon="📋"
            title="Aucune commande pour le moment"
            subtitle="Les nouvelles commandes apparaîtront ici en temps réel"
          />
        )}
      </div>
    </div>
  );
}
