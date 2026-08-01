import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

export default function ReservationPage() {
  const { slug } = useParams();
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    date: "",
    time: "",
    partySize: 2,
  });
  const [submitted, setSubmitted] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => api.get(`/restaurants/${slug}`).then((r) => r.data),
  });

  const reservationMutation = useMutation({
    mutationFn: (data) => api.post("/reservations", data),
    onSuccess: (response) => {
      setSubmitted(response.data);
      toast.success("Réservation envoyée !");
    },
    onError: () => toast.error("Erreur lors de la réservation"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!restaurant || !form.customerName || !form.customerPhone || !form.date || !form.time) return;
    reservationMutation.mutate({
      restaurantId: restaurant._id,
      ...form,
      partySize: parseInt(form.partySize, 10),
    });
  };

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Restaurant introuvable</p>
      </div>
    );
  }

  const fieldClass =
    "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50/40 pb-16">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-sm">
            🍽️
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-[11px] text-emerald-600 font-semibold">
              Réservation
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/10" />
        <div className="relative max-w-lg mx-auto px-4 py-7">
          <p className="text-emerald-100 text-[11px] font-semibold uppercase tracking-widest">
            Réserver une table
          </p>
          <h2 className="text-2xl font-bold mt-1">Votre table vous attend</h2>
          <p className="text-emerald-100 text-sm mt-1.5">
            Nous confirmons votre réservation en quelques minutes.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">
        {submitted ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center animate-fade-up">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-4">
              Réservation envoyée !
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              Merci {submitted.customerName} — nous vous attendons le{" "}
              <span className="font-semibold text-gray-700">
                {new Date(submitted.date).toLocaleDateString("fr-FR")}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-gray-700">
                {submitted.time}
              </span>{" "}
              pour <span className="font-semibold text-gray-700">{submitted.partySize}</span>{" "}
              personne{submitted.partySize > 1 ? "s" : ""}.
            </p>
            <Link
              to={`/r/${restaurant.slug}`}
              className="inline-block mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Voir le menu
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
          >
            <div>
              <label className={labelClass}>Nom complet</label>
              <input
                type="text"
                value={form.customerName}
                onChange={update("customerName")}
                placeholder="Jean Dupont"
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={update("customerPhone")}
                placeholder="06 12 34 56 78"
                className={fieldClass}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  min={today}
                  value={form.date}
                  onChange={update("date")}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Heure</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={update("time")}
                  className={fieldClass}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nombre de personnes</label>
              <select
                value={form.partySize}
                onChange={update("partySize")}
                className={fieldClass}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} {n > 1 ? "personnes" : "personne"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={reservationMutation.isPending}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {reservationMutation.isPending ? "Envoi..." : "Réserver"}
            </button>
            <Link
              to={`/r/${restaurant.slug}`}
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              ← Retour au menu
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
