import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { SkeletonCard } from "../../components/Skeleton";

const DAY_LABELS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

const defaultHours = () =>
  Array.from({ length: 7 }, (_, day) => ({
    day,
    open: "10:00",
    close: "22:00",
    closed: false,
  }));

export default function Settings() {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", logo: "", address: "", phone: "" });
  const [hours, setHours] = useState(defaultHours());

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant", "me"],
    queryFn: () => api.get("/restaurants/me").then((r) => r.data),
    onSuccess: (data) => {
      setForm({
        name: data.name || "",
        logo: data.logo || "",
        address: data.address || "",
        phone: data.phone || "",
      });
      if (Array.isArray(data.openingHours) && data.openingHours.length === 7) {
        setHours(data.openingHours);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put("/restaurants/me", payload),
    onSuccess: (response) => {
      toast.success("Réglages enregistrés");
      updateUser({ name: response.data.name, logo: response.data.logo });
      queryClient.invalidateQueries(["restaurant", "me"]);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateHour = (day, field, value) => {
    setHours((prev) =>
      prev.map((h) => (h.day === day ? { ...h, [field]: value } : h))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, openingHours: hours });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 grid grid-cols-1 gap-3">
        <SkeletonCard />
      </div>
    );
  }

  const fieldClass =
    "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Réglages</h1>
      <p className="text-gray-500 text-sm mb-6">
        Informations visibles sur votre menu public et votre page de réservation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className={labelClass}>Nom du restaurant</label>
            <input
              type="text"
              value={form.name}
              onChange={update("name")}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Lien du menu (non modifiable)</label>
            <input
              type="text"
              value={data?.slug || ""}
              disabled
              className={`${fieldClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Menu public : /r/{data?.slug || "..."}
            </p>
          </div>
          <div>
            <label className={labelClass}>Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={update("address")}
              placeholder="12 rue des Saveurs, Paris"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              placeholder="01 23 45 67 89"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Logo (URL)</label>
            <input
              type="url"
              value={form.logo}
              onChange={update("logo")}
              placeholder="https://..."
              className={fieldClass}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Horaires d'ouverture</h2>
          <p className="text-sm text-gray-500 mb-4">
            Les commandes sont bloquées en dehors de ces horaires.
          </p>
          <div className="space-y-1">
            {hours.map((h) => (
              <div
                key={h.day}
                className={`flex items-center gap-3 py-2 border-b border-gray-50 ${
                  h.closed ? "opacity-50" : ""
                }`}
              >
                <span className="w-12 text-sm font-medium text-gray-700">
                  {DAY_LABELS[h.day]}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => updateHour(h.day, "closed", e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Fermé
                </label>
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.open}
                    onChange={(e) => updateHour(h.day, "open", e.target.value)}
                    disabled={h.closed}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                  />
                  <span className="text-gray-400 text-xs">→</span>
                  <input
                    type="time"
                    value={h.close}
                    onChange={(e) => updateHour(h.day, "close", e.target.value)}
                    disabled={h.closed}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
