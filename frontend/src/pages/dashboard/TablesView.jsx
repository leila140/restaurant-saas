import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../../components/EmptyState";
import { SkeletonGrid } from "../../components/Skeleton";

const statusColors = {
  free: "bg-green-100 border-green-300 text-green-700",
  occupied: "bg-red-100 border-red-300 text-red-700",
  reserved: "bg-yellow-100 border-yellow-300 text-yellow-700",
};

export default function TablesView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId;
  const [showQR, setShowQR] = useState(null);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [editId, setEditId] = useState(null);
  const [editNumber, setEditNumber] = useState("");

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables", restaurantId],
    queryFn: () => api.get("/tables", { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/tables", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["tables", restaurantId]);
      setNewNumber("");
      setNewCapacity(4);
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
      <div className="p-4 sm:p-6">
        <SkeletonGrid count={6} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tables</h1>
        {(user.role === "owner" || user.role === "manager") && (
          <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-center">
            <input
              type="number"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="Numéro"
              className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              value={newCapacity}
              onChange={(e) => setNewCapacity(parseInt(e.target.value))}
              placeholder="Places"
              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm"
            >
              Ajouter
            </button>
          </form>
        )}
      </div>

      {/* Tables grid */}
      {tables.length === 0 ? (
        <EmptyState
          icon="🪑"
          title="Aucune table"
          subtitle="Ajoute ta première table pour générer son QR code"
        />
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div
            key={table._id}
            className={`rounded-xl border-2 p-4 text-center transition-all ${
              statusColors[table.status] || "border-gray-200"
            } ${editId === table._id ? "ring-2 ring-emerald-500" : ""}`}
          >
            {editId === table._id ? (
              <div className="space-y-2">
                <input
                  type="number"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm text-center"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: table._id,
                        number: parseInt(editNumber),
                      })
                    }
                    className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs"
                  >
                    X
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-1">🪑</div>
                <div className="font-bold text-lg">Table {table.number}</div>
                <div className="text-xs mt-1 capitalize">{table.status}</div>
                <div className="text-xs text-gray-500">{table.capacity} pers.</div>
                {(user.role === "owner" || user.role === "manager") && (
                  <div className="flex gap-1 mt-2 justify-center">
                    <button
                      onClick={() => {
                        setEditId(table._id);
                        setEditNumber(table.number);
                      }}
                      className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleQR(table._id)}
                      className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                    >
                      📱
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer cette table ?"))
                          deleteMutation.mutate(table._id);
                      }}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-20"
          onClick={() => setShowQR(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800 mb-2">
              Table {showQR.tableNumber} — QR Code
            </h3>
            <img
              src={showQR.qr}
              alt="QR Code"
              className="w-48 h-48 mx-auto mb-3"
            />
            <p className="text-xs text-gray-500 break-all mb-3">{showQR.url}</p>
            <a
              href={showQR.qr}
              download={`table-${showQR.tableNumber}.png`}
              className="block w-full text-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
            >
              Télécharger
            </a>
            <button
              onClick={() => setShowQR(null)}
              className="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
