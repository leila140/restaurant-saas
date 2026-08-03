import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../context/AuthContext";
import { playNewOrderSound } from "../../utils/sound";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";
import CheckoutModal from "../../components/CheckoutModal";
import ReceiptModal from "../../components/ReceiptModal";
import { downloadCSV, formatMoney } from "../../utils/csv";

const toLocalInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const defaultExportRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toLocalInput(from), to: toLocalInput(to) };
};

const statusConfig = {
  pending: {
    label: "En attente",
    dot: "bg-amber-500",
    accent: "border-l-amber-400",
    chip: "bg-amber-50 text-amber-700",
  },
  preparing: {
    label: "En préparation",
    dot: "bg-blue-500",
    accent: "border-l-blue-400",
    chip: "bg-blue-50 text-blue-700",
  },
  ready: {
    label: "Prêt",
    dot: "bg-green-500",
    accent: "border-l-green-500",
    chip: "bg-green-50 text-green-700",
  },
  served: {
    label: "Servi",
    dot: "bg-gray-400",
    accent: "border-l-gray-300",
    chip: "bg-gray-100 text-gray-600",
  },
  paid: {
    label: "Payé",
    dot: "bg-emerald-500",
    accent: "border-l-emerald-500",
    chip: "bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Annulé",
    dot: "bg-red-500",
    accent: "border-l-red-400",
    chip: "bg-red-50 text-red-700",
  },
};

const primaryAction = {
  pending: { label: "Préparer", cls: "bg-blue-600 hover:bg-blue-700" },
  preparing: { label: "Prêt", cls: "bg-green-600 hover:bg-green-700" },
  ready: { label: "Servi", cls: "bg-emerald-600 hover:bg-emerald-700" },
  served: { label: "Payer", cls: "bg-emerald-600 hover:bg-emerald-700" },
};

const timeAgo = (dateStr) => {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  return `il y a ${h} h ${mins % 60}`;
};

const orderItemCount = (order) =>
  (order.items || []).reduce((s, i) => s + i.quantity, 0);

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
  const [checkoutBill, setCheckoutBill] = useState(null);
  const [receiptNumber, setReceiptNumber] = useState(null);
  const [showReceipts, setShowReceipts] = useState(false);
  const [exportRange, setExportRange] = useState(defaultExportRange);

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

  const isServerLike = role === "owner" || role === "manager" || role === "server";

  const { data: bills = [] } = useQuery({
    queryKey: ["orders", restaurantId, "bills"],
    queryFn: () => api.get("/orders/bills").then((r) => r.data),
    enabled: !!restaurantId && isServerLike,
    refetchInterval: 15000,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ tableId, ...payment }) =>
      api.post("/orders/checkout", { tableId, ...payment }),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["orders", restaurantId]);
      queryClient.invalidateQueries(["tables", restaurantId]);
      queryClient.invalidateQueries(["orders", restaurantId, "bills"]);
      queryClient.invalidateQueries(["orders", restaurantId, "receipts"]);
      setCheckoutBill(null);
      setReceiptNumber(response.data.receipt?.receiptNumber || null);
      toast.success("Addition encaissée, table libérée");
    },
    onError: () => toast.error("Erreur lors de l'encaissement"),
  });

  const exportMutation = useMutation({
    mutationFn: ({ from, to }) =>
      api.get("/orders/export", { params: { from, to } }).then((r) => r.data),
    onSuccess: (rows) => {
      if (!rows.length) return toast.error("Aucune commande sur cette période");
      downloadCSV(
        `commandes_${exportRange.from}_${exportRange.to}.csv`,
        [
          "Date",
          "Heure",
          "Table",
          "Statut",
          "Articles",
          "Qté",
          "Sous-total",
          "Remise %",
          "Montant remise",
          "Pourboire",
          "Total payé",
          "Paiement",
          "N° ticket",
        ],
        rows.map((r) => [
          new Date(r.createdAt).toLocaleDateString("fr-FR"),
          new Date(r.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          r.tableNumber,
          r.status,
          r.items,
          r.itemCount,
          formatMoney(r.subtotal),
          r.discountPercent,
          formatMoney(r.discountAmount),
          formatMoney(r.tip),
          formatMoney(r.totalPaid),
          r.paymentMethod,
          r.receiptNumber,
        ])
      );
      toast.success(`Export : ${rows.length} commande(s)`);
    },
    onError: () => toast.error("Erreur lors de l'export"),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["orders", restaurantId, "receipts"],
    queryFn: () => api.get("/orders/receipts").then((r) => r.data),
    enabled: !!restaurantId && isServerLike && showReceipts,
  });

  useEffect(() => {
    if (!on || !off) return;

    const handleNewOrder = () => {
      if (soundEnabled) playNewOrderSound();
      queryClient.invalidateQueries(["orders", restaurantId]);
      queryClient.invalidateQueries(["orders", restaurantId, "bills"]);
    };

    const handleStatusChanged = () => {
      queryClient.invalidateQueries(["orders", restaurantId]);
      queryClient.invalidateQueries(["orders", restaurantId, "bills"]);
    };

    const handleCheckout = () => {
      queryClient.invalidateQueries(["orders", restaurantId, "bills"]);
      queryClient.invalidateQueries(["tables", restaurantId]);
    };

    on("order:new", handleNewOrder);
    on("order:statusChanged", handleStatusChanged);
    on("orders:checkout", handleCheckout);

    return () => {
      off("order:new", handleNewOrder);
      off("order:statusChanged", handleStatusChanged);
      off("orders:checkout", handleCheckout);
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

  const statusCounts = {};
  (orders || []).forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const liveCount = (statusCounts.pending || 0) + (statusCounts.preparing || 0);

  const renderOrderCard = (order) => {
    const cfg = statusConfig[order.status] || statusConfig.pending;
    const isNew =
      order.status === "pending" &&
      Date.now() - new Date(order.createdAt).getTime() < 120000;
    const count = orderItemCount(order);

    return (
      <div
        key={order._id}
        className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.accent} shadow-sm p-4 animate-fade-up transition-shadow hover:shadow-md`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-800">
              T{order.tableId?.number || "?"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">
                Table {order.tableId?.number || "?"}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            {isNew && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wide animate-pulse mb-1">
                Nouveau
              </span>
            )}
            <p className="text-xs text-gray-400">{timeAgo(order.createdAt)}</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 shrink-0 rounded-md bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center">
                {item.quantity}
              </span>
              <span className="text-gray-700 flex-1 truncate">
                {item.name}
                {item.notes && (
                  <span className="text-gray-400 italic ml-1">
                    ({item.notes})
                  </span>
                )}
              </span>
              <span className="font-medium text-gray-800 tabular-nums">
                {(item.price * item.quantity).toFixed(2)} €
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {count} article{count > 1 ? "s" : ""}
          </span>
          <span className="font-display text-lg font-semibold text-gray-900 tabular-nums">
            {order.totalPrice.toFixed(2)} €
          </span>
        </div>

        {order.status !== "paid" && order.status !== "cancelled" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {order.status === "pending" && actions.pending && (
              <button
                onClick={() =>
                  statusMutation.mutate({
                    id: order._id,
                    status: actions.pending,
                  })
                }
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${primaryAction.pending.cls}`}
              >
                {primaryAction.pending.label}
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
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${primaryAction.preparing.cls}`}
              >
                {primaryAction.preparing.label}
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
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${primaryAction.ready.cls}`}
              >
                {primaryAction.ready.label}
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
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${primaryAction.served.cls}`}
              >
                {primaryAction.served.label}
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
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSectionHeader = (icon, title, count) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-8 h-8 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center text-base">
        {icon}
      </span>
      <h2 className="font-semibold text-gray-800">{title}</h2>
      {count > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
          {count}
        </span>
      )}
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
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-600/10">
              🧾
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  Commandes
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${
                    liveCount > 0
                      ? "bg-amber-50 text-amber-700 ring-amber-200 animate-pulse"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  }`}
                >
                  {liveCount > 0
                    ? `${liveCount} en cours`
                    : "Toutes à jour"}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Suivi des commandes en temps réel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              title="Son de notification nouvelle commande"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                soundEnabled
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-base leading-none">
                {soundEnabled ? "🔔" : "🔕"}
              </span>
              <span>Son</span>
            </button>
            <button
              onClick={() => setShowReceipts((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                showReceipts
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-base leading-none">🖨️</span>
              <span>Reçus</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {allowedStatuses ? (
              allowedStatuses.map((s) => (
                <span
                  key={s}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[s]?.chip}`}
                >
                  {statusConfig[s]?.label}
                </span>
              ))
            ) : (
              <>
                <button
                  onClick={() => setFilterStatus(null)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !filterStatus
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Toutes
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      !filterStatus
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {orders?.length || 0}
                  </span>
                </button>
                {Object.entries(statusConfig).map(([key, cfg]) => {
                  const count = statusCounts[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filterStatus === key
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          filterStatus === key ? "bg-white" : cfg.dot
                        }`}
                      />
                      {cfg.label}
                      {count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                            filterStatus === key
                              ? "bg-white/20 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {isServerLike && (
            <div className="lg:ml-auto flex flex-wrap items-center gap-2.5 lg:border-l lg:border-gray-100 lg:pl-4 pt-3 lg:pt-0 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-400">Période</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:outline-none transition-all">
                <input
                  type="date"
                  value={exportRange.from}
                  onChange={(e) =>
                    setExportRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                  className="px-2.5 py-2 text-sm bg-transparent focus:outline-none [color-scheme:light]"
                />
                <span className="text-gray-300 text-sm px-0.5">→</span>
                <input
                  type="date"
                  value={exportRange.to}
                  onChange={(e) =>
                    setExportRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="px-2.5 py-2 text-sm bg-transparent focus:outline-none [color-scheme:light]"
                />
              </div>
              <button
                onClick={() =>
                  exportMutation.mutate({
                    from: exportRange.from,
                    to: exportRange.to,
                  })
                }
                disabled={exportMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 shadow-sm transition-colors"
              >
                <span className="text-sm leading-none">⬇️</span>
                {exportMutation.isPending ? "Export..." : "Exporter"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {isServerLike && bills.length > 0 && (
          <div>
            {renderSectionHeader("💰", "Additions en cours", bills.length)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bills.map((bill) => {
                const billItems = bill.orders.reduce(
                  (s, o) => s + orderItemCount(o),
                  0
                );
                return (
                  <div
                    key={bill.tableId}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                          T{bill.tableNumber}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">
                            Table {bill.tableNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            {bill.count} commande{bill.count > 1 ? "s" : ""} ·{" "}
                            {billItems} article{billItems > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">
                          Total
                        </p>
                        <p className="font-display text-xl font-semibold text-emerald-900 tabular-nums">
                          {bill.total.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5 max-h-40 overflow-auto">
                      {bill.orders.map((order) =>
                        order.items.map((item, i) => (
                          <div
                            key={`${order._id}-${i}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="w-6 h-6 shrink-0 rounded-md bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center">
                              {item.quantity}
                            </span>
                            <span className="text-gray-700 flex-1 truncate">
                              {item.name}
                            </span>
                            <span className="font-medium text-gray-600 tabular-nums">
                              {(item.price * item.quantity).toFixed(2)} €
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => setCheckoutBill(bill)}
                        className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-semibold transition-colors shadow-sm"
                      >
                        Encaisser — {bill.total.toFixed(2)} €
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showReceipts && (
          <div>
            {renderSectionHeader("🧾", "Derniers tickets", receipts.length)}
            {receipts.length === 0 ? (
              <EmptyState
                icon="🧾"
                title="Aucun ticket pour le moment"
                subtitle="Les tickets apparaissent après chaque encaissement"
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                {receipts.map((r) => (
                  <button
                    key={r.receiptNumber}
                    onClick={() => setReceiptNumber(r.receiptNumber)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                      🧾
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        Ticket{" "}
                        <span className="font-semibold">
                          #{String(r.receiptNumber).padStart(4, "0")}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        Table {r.tableNumber} ·{" "}
                        {new Date(r.paidAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      {r.total.toFixed(2)} €
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {role !== "server" && grouped.kitchen.length > 0 && (
          <div>
            {renderSectionHeader("🍳", "En cuisine", grouped.kitchen.length)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped.kitchen.map(renderOrderCard)}
            </div>
          </div>
        )}

        {grouped.ready.length > 0 && (
          <div>
            {renderSectionHeader("✅", "Prêtes à servir", grouped.ready.length)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped.ready.map(renderOrderCard)}
            </div>
          </div>
        )}

        {role !== "kitchen" && grouped.served.length > 0 && (
          <div>
            {renderSectionHeader("📋", "Servies / Payées", grouped.served.length)}
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

      {checkoutBill && (
        <CheckoutModal
          bill={checkoutBill}
          isPending={checkoutMutation.isPending}
          onConfirm={(payload) =>
            checkoutMutation.mutate({
              tableId: checkoutBill.tableId,
              ...payload,
            })
          }
          onClose={() => setCheckoutBill(null)}
        />
      )}

      {receiptNumber && (
        <ReceiptModal
          receiptNumber={receiptNumber}
          onClose={() => setReceiptNumber(null)}
        />
      )}
    </div>
  );
}
