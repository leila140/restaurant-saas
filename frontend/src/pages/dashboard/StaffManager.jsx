import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";

const roleLabels = {
  owner: "Propriétaire",
  manager: "Manager",
  kitchen: "Cuisine",
  server: "Serveur",
};

export default function StaffManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "server",
  });
  const [error, setError] = useState("");

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get("/auth/staff").then((r) => r.data),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/auth/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["staff"]);
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "server" });
      setError("");
      toast.success("Membre ajouté");
    },
    onError: (err) => {
      setError(err.response?.data?.error || "Erreur");
      toast.error(err.response?.data?.error || "Erreur lors de la création");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/auth/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["staff"]);
      toast.success("Membre mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/auth/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["staff"]);
      toast.success("Membre supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const handleToggleActive = (member) => {
    updateMutation.mutate({
      id: member._id,
      data: { isActive: !member.isActive },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Équipe</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
        >
          + Ajouter
        </button>
      </div>

      {/* Add staff form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <h2 className="font-semibold text-gray-700 mb-3">
            Nouveau membre
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mot de passe"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
                minLength={6}
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="server">Serveur</option>
                <option value="kitchen">Cuisine</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Création..." : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff list */}
      <div className="space-y-2">
        {staff.map((member) => (
          <div
            key={member._id}
            className={`bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
              !member.isActive ? "opacity-50" : ""
            }`}
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  {member.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {roleLabels[member.role] || member.role}
                </span>
                {!member.isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                    Inactif
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
            <div className="flex gap-2">
              {member.role !== "owner" && (
                <>
                  <button
                    onClick={() => handleToggleActive(member)}
                    className={`px-3 py-1 text-xs rounded-lg ${
                      member.isActive
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-green-50 text-green-600 hover:bg-green-100"
                    }`}
                  >
                    {member.isActive ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer ${member.name} ?`))
                        deleteMutation.mutate(member._id);
                    }}
                    className="px-3 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <EmptyState
            icon="👥"
            title="Aucun membre dans l'équipe"
            subtitle="Ajoute ton premier membre pour commencer"
          />
        )}
      </div>
    </div>
  );
}
