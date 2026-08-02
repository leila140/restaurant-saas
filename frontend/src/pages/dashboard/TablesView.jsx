import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../../components/EmptyState";
import { SkeletonGrid } from "../../components/Skeleton";

const STATUS = ["free", "occupied", "reserved"];

const statusLabels = {
  free: "Libre",
  occupied: "Occupée",
  reserved: "Réservée",
};

const statusChip = {
  free: "bg-emerald-50 text-emerald-700 border-emerald-200",
  occupied: "bg-rose-50 text-rose-700 border-rose-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusDot = {
  free: "bg-emerald-500",
  occupied: "bg-rose-500",
  reserved: "bg-amber-500",
};

const inputClass =
  "w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/15 focus:border-emerald-900/40 transition-shadow";

const canManage = (role) =>
  role === "owner" || role === "manager" || role === "server";

export default function TablesView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId;
  const { on, off } = useSocket(restaurantId);
  const [showQR, setShowQR] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [editId, setEditId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [editCapacity, setEditCapacity] = useState(4);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables", restaurantId],
    queryFn: () => api.get("/tables", { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!on || !off) return;

    const handleTableChanged = () => {
      queryClient.invalidateQueries(["tables", restaurantId]);
    };

    on("table:statusChanged", handleTableChanged);

    return () => {
      off("table:statusChanged", handleTableChanged);
    };
  }, [on, off, restaurantId, queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/tables", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["tables", restaurantId]);
      setNewNumber("");
      setNewCapacity(4);
      setShowAdd(false);
      toast.success("Table ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/tables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["tables", restaurantId]);
      setEditId(null);
      toast.success("Table modifiée");
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["tables", restaurantId]);
      toast.success("Table supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const qrMutation = useMutation({
    mutationFn: (id) => api.get(`/tables/${id}/qr`),
  });

  const { data: printData, isLoading: printLoading } = useQuery({
    queryKey: ["tables", restaurantId, "print"],
    queryFn: () => api.get("/tables/qr/print").then((r) => r.data),
    enabled: showPrint,
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newNumber) return;
    createMutation.mutate({
      number: parseInt(newNumber),
      capacity: newCapacity,
      restaurantId,
    });
  };

  const handleQR = async (id) => {
    const result = await qrMutation.mutateAsync(id);
    setShowQR(result.data);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonGrid count={6} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" />
      </div>
    );
  }

  const counts = STATUS.reduce((acc, s) => {
    acc[s] = tables.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-800 font-semibold">
              Salle
            </p>
            <h1 className="font-display text-3xl font-semibold text-stone-900 mt-2">
              Tables
            </h1>
            <p className="text-sm text-stone-500 mt-2">
              {tables.length > 0
                ? `${tables.length} table${tables.length > 1 ? "s" : ""} · ${counts.free} libre${counts.free > 1 ? "s" : ""}, ${counts.occupied} occupée${counts.occupied > 1 ? "s" : ""}, ${counts.reserved} réservée${counts.reserved > 1 ? "s" : ""}`
                : "Ajoutez vos tables pour générer leurs QR codes"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowPrint(true)}
              disabled={tables.length === 0}
              className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-sm font-medium hover:border-stone-500 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Imprimer les QR
            </button>
            {(user.role === "owner" || user.role === "manager") && (
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="px-5 py-2.5 rounded-full bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
              >
                {showAdd ? "Annuler" : "Nouvelle table"}
              </button>
            )}
          </div>
        </header>

        {/* Add form */}
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 animate-fade-up"
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-800 font-semibold mb-5">
              Nouvelle table
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Numéro
                </label>
                <input
                  type="number"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="4"
                  className={`${inputClass} w-28`}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Places
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value))}
                  className={`${inputClass} w-24`}
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2.5 rounded-full bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Ajout..." : "Ajouter la table"}
              </button>
            </div>
          </form>
        )}

        {/* Tables grid */}
        {tables.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon="🪑"
              title="Aucune table"
              subtitle="Ajoute ta première table pour générer son QR code"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <article
                key={table._id}
                className={`relative bg-white rounded-2xl border p-5 overflow-hidden transition-shadow ${
                  editId === table._id
                    ? "border-emerald-900/50 shadow-lg shadow-emerald-900/5"
                    : "border-stone-200 hover:shadow-md hover:shadow-stone-900/5"
                }`}
              >
                {/* Status accent */}
                <span
                  className={`absolute inset-x-0 top-0 h-0.5 ${statusDot[table.status]}`}
                />

                {editId === table._id ? (
                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold mb-1">
                          N°
                        </label>
                        <input
                          type="number"
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          className={`${inputClass} w-16 text-center`}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold mb-1">
                          Places
                        </label>
                        <input
                          type="number"
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(e.target.value)}
                          className={`${inputClass} w-16 text-center`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: table._id,
                            number: parseInt(editNumber),
                            capacity: parseInt(editCapacity),
                          })
                        }
                        className="flex-1 px-3 py-2 rounded-full bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="px-3 py-2 rounded-full border border-stone-200 text-stone-500 text-xs font-medium hover:border-stone-400 hover:text-stone-700 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-semibold">
                          Table
                        </p>
                        <h3 className="font-display text-3xl font-semibold text-stone-900 mt-1 tabular-nums">
                          {table.number}
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusChip[table.status]}`}
                      >
                        {statusLabels[table.status]}
                      </span>
                    </div>

                    <p className="text-[13px] text-stone-500 mt-1.5">
                      {table.capacity} personne{table.capacity > 1 ? "s" : ""}
                    </p>

                    {canManage(user.role) && (
                      <div className="mt-5 pt-4 border-t border-stone-100">
                        <div className="rounded-full bg-stone-100 p-1 flex gap-0.5">
                          {STATUS.map((s) => (
                            <button
                              key={s}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: table._id,
                                  status: s,
                                })
                              }
                              className={`flex-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all ${
                                table.status === s
                                  ? "bg-white text-stone-900 shadow-sm"
                                  : "text-stone-400 hover:text-stone-600"
                              }`}
                            >
                              {statusLabels[s]}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <button
                            title="QR code"
                            onClick={() => handleQR(table._id)}
                            className="w-8 h-8 rounded-full border border-stone-200 text-stone-500 hover:border-emerald-900 hover:text-emerald-900 hover:bg-emerald-50 transition-colors flex items-center justify-center"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7" rx="1" />
                              <rect x="14" y="3" width="7" height="7" rx="1" />
                              <rect x="3" y="14" width="7" height="7" rx="1" />
                              <path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M18 18h.01M21 21h-3v-3" />
                            </svg>
                          </button>
                          {user.role === "owner" || user.role === "manager" ? (
                            <>
                              <button
                                title="Modifier"
                                onClick={() => {
                                  setEditId(table._id);
                                  setEditNumber(table.number);
                                  setEditCapacity(table.capacity);
                                }}
                                className="w-8 h-8 rounded-full border border-stone-200 text-stone-500 hover:border-emerald-900 hover:text-emerald-900 hover:bg-emerald-50 transition-colors flex items-center justify-center"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                title="Supprimer"
                                onClick={() => {
                                  if (confirm("Supprimer cette table ?"))
                                    deleteMutation.mutate(table._id);
                                }}
                                className="w-8 h-8 rounded-full border border-stone-200 text-stone-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                </svg>
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* QR Modal */}
        {showQR && (
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-20"
            onClick={() => setShowQR(null)}
          >
            <div
              className="bg-white rounded-3xl p-8 max-w-sm mx-4 w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-800 font-semibold">
                Table {showQR.tableNumber}
              </p>
              <h3 className="font-display text-2xl font-semibold text-stone-900 mt-1 mb-5">
                QR code
              </h3>
              <div className="inline-block p-3 rounded-2xl border border-stone-200 bg-white">
                <img
                  src={showQR.qr}
                  alt="QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>
              <p className="text-[11px] text-stone-400 break-all mt-5 leading-relaxed">
                {showQR.url}
              </p>
              <a
                href={showQR.qr}
                download={`table-${showQR.tableNumber}.png`}
                className="block w-full text-center px-5 py-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-sm font-semibold transition-colors mt-5"
              >
                Télécharger le QR
              </a>
              <button
                onClick={() => setShowQR(null)}
                className="w-full mt-2 px-5 py-3 border border-stone-200 text-stone-600 rounded-full text-sm font-medium hover:border-stone-400 hover:text-stone-900 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Print sheet */}
        {showPrint && (
          <>
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #print-sheet, #print-sheet * { visibility: visible; }
                #print-sheet { position: absolute; inset: 0; }
              }
            `}</style>
            <div
              id="print-sheet"
              className="fixed inset-0 z-30 bg-stone-100 overflow-auto p-6"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6 print:hidden">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-800 font-semibold">
                      Salle
                    </p>
                    <h2 className="font-display text-2xl font-semibold text-stone-900 mt-1">
                      QR codes des tables
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-5 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-sm font-semibold"
                    >
                      Imprimer
                    </button>
                    <button
                      onClick={() => setShowPrint(false)}
                      className="px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-full text-sm font-medium hover:border-stone-400"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
                {printLoading ? (
                  <div className="animate-pulse bg-white rounded-2xl h-48" />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {printData?.tables?.map((t) => (
                      <div
                        key={t._id}
                        className="bg-white rounded-2xl border border-dashed border-stone-300 p-5 text-center break-inside-avoid"
                      >
                        <img
                          src={t.qr}
                          alt={`Table ${t.number}`}
                          className="w-32 h-32 mx-auto"
                        />
                        <p className="mt-3 font-display text-lg font-semibold text-stone-900">
                          Table {t.number}
                        </p>
                        <p className="text-xs text-stone-400">
                          {t.capacity} pers.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
