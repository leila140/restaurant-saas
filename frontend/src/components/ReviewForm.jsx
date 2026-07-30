import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../../services/api";

export default function ReviewForm({ restaurantId, orderId, items, tableNumber, onDone }) {
  const [ratings, setRatings] = useState(
    Object.fromEntries(items.map((i) => [i.menuItemId, 0]))
  );
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: (data) => api.post("/reviews", data),
  });

  const handleRating = (menuItemId, rating) => {
    setRatings((prev) => ({ ...prev, [menuItemId]: rating }));
  };

  const handleSubmit = () => {
    const entries = Object.entries(ratings).filter(([, r]) => r > 0);
    if (entries.length === 0) {
      onDone();
      return;
    }

    const promises = entries.map(([menuItemId, rating]) =>
      mutation.mutateAsync({
        restaurantId,
        menuItemId,
        orderId,
        tableNumber,
        rating,
        comment,
      })
    );

    Promise.all(promises)
      .then(() => onDone())
      .catch(() => onDone());
  };

  const allRated = Object.values(ratings).every((r) => r > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-bold text-gray-800 mb-4">
        Notez vos plats ⭐
      </h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.menuItemId}>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {item.name}
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(item.menuItemId, star)}
                  className={`text-xl transition-colors ${
                    ratings[item.menuItemId] >= star
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-yellow-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire ? (optionnel)"
        className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        rows={2}
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Envoi..." : allRated ? "Envoyer" : "Passer"}
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
