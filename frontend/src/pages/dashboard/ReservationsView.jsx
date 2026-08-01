import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";

const TABS = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Confirmées" },
  { key: "cancelled", label: "Annulées" },
];

const statusBadge = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabel = {
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
};

export default function ReservationsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId;
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["reservations", restaurantId, dateFilter],
    queryFn: () =>
      api
        .get("/reservations", {
          params: { restaurantId, date: dateFilter },
        })
        .then((r) => r.data),
    enabled: !!restaurantId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", restaurantId],
    queryFn: () =>
      api.get("/tables", { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const errMsg = (err) => {
    const msg = err?.response?.data?.error;
    return msg || "Erreur lors de la mise à jour";
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/reservations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["reservations", restaurantId]);
      queryClient.invalidateQueries(["tables", restaurantId]);
      toast.success("Réservation mise à jour");
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/reservations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["reservations", restaurantId]);
      queryClient.invalidateQueries(["tables", restaurantId]);
      toast.success("Réservation supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleAssignTable = (reservationId, tableId) => {
    updateMutation.mutate({
      id: reservationId,
      data: { tableId, status: "confirmed" },
    });
  };

  const handleConfirm = (reservationId) => {
    updateMutation.mutate({ id: reservationId, data: { status: "confirmed" } });
  };

  const handleStatus = (reservationId, status) => {
    updateMutation.mutate({ id: reservationId, data: { status } });
  };

  const freeTables = tables.filter((t) => t.status === "free");

  const counts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  const filtered =
    statusFilter === "all"
      ? reservations
      : reservations.filter((r) => r.status === statusFilter);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Réservations</h1>
        {counts.pending > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
            {counts.pending} en attente
          </span>
        )}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="ml-1.5 text-xs opacity-80">{counts[tab.key]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucune réservation"
          subtitle="Aucune réservation ne correspond à cette recherche"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((res) => (
            <div
              key={res._id}
              className="bg-white rounded-xl shadow-sm p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800">
                      {res.customerName}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[res.status]}`}
                    >
                      {statusLabel[res.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                    <p>
                      📞 {res.customerPhone} — {res.time} — 👥{" "}
                      {res.partySize} pers.
                    </p>
                    <p>
                      🪑{" "}
                      {res.tableId
                        ? `Table ${res.tableId.number}`
                        : "Table non assignée"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {res.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleConfirm(res._id)}
                        className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        ✓ Confirmer
                      </button>
                      <select
                        onChange={(e) => {
                          if (e.target.value)
                            handleAssignTable(res._id, e.target.value);
                        }}
                        value=""
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="">Assigner table</option>
                        {freeTables.map((t) => (
                          <option key={t._id} value={t._id}>
                            Table {t.number} ({t.capacity}p)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleStatus(res._id, "cancelled")}
                        className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                  {res.status === "confirmed" && (
                    <button
                      onClick={() => handleStatus(res._id, "cancelled")}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                    >
                      Annuler
                    </button>
                  )}
                  {(user.role === "owner" || user.role === "manager") && (
                    <button
                      onClick={() => {
                        if (confirm("Supprimer cette réservation ?"))
                          deleteMutation.mutate(res._id);
                      }}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
