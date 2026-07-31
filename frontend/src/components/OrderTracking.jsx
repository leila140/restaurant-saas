import { useState, useEffect } from "react";
import useSocket from "../hooks/useSocket";
import ReviewForm from "./ReviewForm";

const steps = [
  { key: "pending", label: "Commande reçue", icon: "📝" },
  { key: "preparing", label: "En préparation", icon: "🍳" },
  { key: "ready", label: "Prêt à servir", icon: "✅" },
  { key: "served", label: "Servi", icon: "🍽️" },
  { key: "paid", label: "Payé", icon: "💳" },
];

export default function OrderTracking({ orderId, restaurantId, currentStatus, tableNumber, total, items }) {
  const [status, setStatus] = useState(currentStatus);
  const [showReview, setShowReview] = useState(false);
  const { on, off } = useSocket(restaurantId);

  useEffect(() => {
    if (!on || !off || !orderId) return;

    const handler = (order) => {
      if (order._id === orderId) {
        setStatus(order.status);
      }
    };

    on("order:statusChanged", handler);
    return () => off("order:statusChanged", handler);
  }, [on, off, orderId]);

  const currentIndex = steps.findIndex((s) => s.key === status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-gray-600 font-medium">Commande annulée</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl animate-bounce">🎉</div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Commande confirmée !
          </h2>
          <p className="text-sm text-gray-500">
            Table {tableNumber} · {total.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;

          return (
            <div key={step.key} className="flex items-start gap-3 relative">
              {/* Ligne verticale */}
              {i < steps.length - 1 && (
                <div
                  className={`absolute left-3 top-8 w-0.5 h-10 ${
                    done ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
              {/* Cercle */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  done
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                } ${active ? "ring-2 ring-green-500 ring-offset-2" : ""}`}
              >
                {done ? "✓" : i + 1}
              </div>
              {/* Label */}
              <div className={`pb-6 ${done ? "opacity-100" : "opacity-40"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <span
                    className={`font-medium ${
                      done ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {active && (
                    <span className="text-xs text-green-600 animate-pulse">
                      En cours...
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {status === "paid" && !showReview && (
        <div className="mt-4 text-center space-y-3">
          <p className="text-gray-500 text-sm">Merci d'avoir mangé chez nous !</p>
          <button
            onClick={() => setShowReview(true)}
            className="px-4 py-2 bg-yellow-400 text-gray-800 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
          >
            Notez vos plats ⭐
          </button>
        </div>
      )}
      {showReview && items && (
        <div className="mt-4">
          <ReviewForm
            restaurantId={restaurantId}
            orderId={orderId}
            items={items}
            tableNumber={tableNumber}
            onDone={() => setShowReview(false)}
          />
        </div>
      )}
    </div>
  );
}
