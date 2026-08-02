import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { todayStatus } from "../../utils/hours";

export default function ReservationPage() {
  const { slug } = useParams();
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-900" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-stone-500">Restaurant introuvable</p>
      </div>
    );
  }

  const fieldClass =
    "w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 bg-white";
  const labelClass = "block text-sm font-medium text-stone-600 mb-1";

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-lg mx-auto px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-emerald-900 text-white flex items-center justify-center font-display text-sm font-semibold">
              {(restaurant.name || "R").trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="font-display text-lg font-semibold text-stone-900 leading-tight">
                {restaurant.name}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-800 font-semibold">
                Réservation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Intro */}
      <div className="max-w-lg mx-auto px-5 pt-10 pb-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-800 font-semibold">
          Réserver une table
        </p>
        <h2 className="font-display text-3xl font-semibold text-stone-900 mt-3 leading-snug">
          Votre table vous attend
        </h2>
        <p className="text-[15px] text-stone-500 mt-3 leading-relaxed max-w-sm mx-auto">
          Nous confirmons votre réservation en quelques minutes.
        </p>
        {(() => {
          const status = todayStatus(restaurant.openingHours);
          if (!status.label) return null;
          return (
            <span
              className={`inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full border text-[11px] font-semibold ${
                status.open
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 bg-stone-50 text-stone-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status.open ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
              {status.label}
            </span>
          );
        })()}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-stone-200" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Détails</span>
          <span className="h-px w-12 bg-stone-200" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-2">
        {submitted ? (
          <div className="text-center animate-fade-up">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-900 text-white flex items-center justify-center text-3xl">
              ✓
            </div>
            <h3 className="font-display text-2xl font-semibold text-stone-900 mt-6">
              Réservation envoyée !
            </h3>
            <p className="text-stone-500 text-sm mt-3 leading-relaxed">
              Merci {submitted.customerName} — nous vous attendons le{" "}
              <span className="font-semibold text-stone-800">
                {new Date(submitted.date).toLocaleDateString("fr-FR")}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-stone-800">
                {submitted.time}
              </span>{" "}
              pour <span className="font-semibold text-stone-800">{submitted.partySize}</span>{" "}
              personne{submitted.partySize > 1 ? "s" : ""}.
            </p>
            <Link
              to={`/r/${restaurant.slug}`}
              className="inline-block mt-8 px-6 py-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-sm font-semibold transition-colors"
            >
              Voir le menu
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
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
            <div>
              <label className={labelClass}>Email (pour la confirmation)</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={update("customerEmail")}
                placeholder="jean@exemple.fr"
                className={fieldClass}
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
              className="w-full py-3.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full font-semibold transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {reservationMutation.isPending ? "Envoi..." : "Réserver"}
            </button>
            <Link
              to={`/r/${restaurant.slug}`}
              className="block text-center text-sm text-stone-500 hover:text-stone-800"
            >
              ← Retour au menu
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
