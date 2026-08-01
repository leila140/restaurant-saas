import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import Confetti from "../../components/Confetti";
import OrderTracking from "../../components/OrderTracking";

const EMOJI_RULES = [
  [/entr|salade|salad|crudit/i, "🥗"],
  [/pizza/i, "🍕"],
  [/burger|sandwich/i, "🍔"],
  [/pasta|pâte|pates/i, "🍝"],
  [/grill|poulet|viande|steak|poisson/i, "🍖"],
  [/soupe|soup/i, "🍜"],
  [/frite|frites/i, "🍟"],
  [/dessert|gâteau|gateau|tarte|crème|creme|cake/i, "🍰"],
  [/boisson|drink|soda|jus|thé|the |café|cafe|bière|vin/i, "🥤"],
];

const dishEmoji = (name = "") => {
  for (const [rule, emoji] of EMOJI_RULES) {
    if (rule.test(name)) return emoji;
  }
  return "🍽️";
};

export default function MenuView() {
  const { slug, token } = useParams();
  const [cart, setCart] = useState([]);
  const [tableId, setTableId] = useState(null);
  const [tableNumber, setTableNumber] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  const orderStorageKey = `lastOrder:${token}`;
  const getStoredOrder = () => {
    try {
      const saved = localStorage.getItem(orderStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const [lastOrder, setLastOrder] = useState(getStoredOrder);
  const [orderSuccess, setOrderSuccess] = useState(() => !!getStoredOrder());

  const { data: liveOrder } = useQuery({
    queryKey: ["order-status", lastOrder?._id],
    queryFn: () => api.get(`/orders/${lastOrder._id}/track`).then((r) => r.data),
    enabled: !!lastOrder?._id,
    refetchInterval: 15000,
  });

  // Auto-resolve table from QR token in URL
  useQuery({
    queryKey: ["table-by-token", token],
    queryFn: () =>
      api.get(`/tables/token/${token}`).then((r) => {
        setTableId(r.data._id);
        setTableNumber(r.data.number);
        return r.data;
      }),
    enabled: !!token,
  });

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => api.get(`/restaurants/${slug}`).then((r) => r.data),
  });

  const orderMutation = useMutation({
    mutationFn: (data) => api.post("/orders", data),
    onSuccess: (response) => {
      setLastOrder(response.data);
      localStorage.setItem(orderStorageKey, JSON.stringify(response.data));
      setCart([]);
      setShowCart(false);
      setOrderSuccess(true);
      setConfettiActive(true);
      toast.success("Commande envoyée en cuisine !");
      setTimeout(() => setConfettiActive(false), 4000);
    },
    onError: () => toast.error("Erreur lors de l'envoi de la commande"),
  });

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    setCart((prev) => {
      return prev
        .map((c) =>
          c.menuItemId === menuItemId
            ? { ...c, quantity: c.quantity + delta }
            : c
        )
        .filter((c) => c.quantity > 0);
    });
  };

  const updateNotes = (menuItemId, note) => {
    setCart((prev) =>
      prev.map((c) =>
        c.menuItemId === menuItemId ? { ...c, notes: note } : c
      )
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const qtyOf = (menuItemId) =>
    cart.find((c) => c.menuItemId === menuItemId)?.quantity || 0;

  const handleOrder = () => {
    if (!tableId || cart.length === 0) return;
    orderMutation.mutate({
      restaurantId: restaurant._id,
      tableId,
      items: cart,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50/40 pb-28">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-sm">
              🍽️
            </span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {restaurant.name}
              </h1>
              {tableNumber && (
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Table {tableNumber}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      {!orderSuccess && (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/10" />
          <div className="relative max-w-lg mx-auto px-4 py-7">
            <p className="text-emerald-100 text-[11px] font-semibold uppercase tracking-widest">
              {tableNumber ? `Bienvenue · Table ${tableNumber}` : "Bienvenue"}
            </p>
            <h2 className="text-2xl font-bold mt-1">
              Commandez depuis votre table
            </h2>
            <p className="text-emerald-100 text-sm mt-1.5">
              Ajoutez vos plats au panier et suivez votre commande en temps réel.
            </p>
            <Link
              to={`/r/${restaurant.slug}/reserver`}
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-full text-sm font-medium transition-colors"
            >
              📅 Réserver une table
            </Link>
          </div>
        </div>
      )}

      {/* Confetti */}
      <Confetti active={confettiActive} />

      {/* Order tracking / Success */}
      {orderSuccess && lastOrder && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <OrderTracking
            orderId={lastOrder._id}
            restaurantId={restaurant._id}
            currentStatus={liveOrder?.status || lastOrder.status}
            tableNumber={tableNumber || liveOrder?.tableNumber}
            total={liveOrder?.totalPrice ?? lastOrder.totalPrice}
            items={lastOrder.items}
          />
          <button
            onClick={() => {
              localStorage.removeItem(orderStorageKey);
              setOrderSuccess(false);
              setLastOrder(null);
            }}
            className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            Commander à nouveau
          </button>
        </div>
      )}

      {/* Table selection — only show if no QR token in URL */}
      {!tableId && !token && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Scannez le QR code sur votre table</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tableNumber || ""}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ou entrez le token manuellement"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => {
                  if (tableNumber) {
                    api
                      .get(`/tables/token/${tableNumber}`)
                      .then((r) => {
                        setTableId(r.data._id);
                        setTableNumber(r.data.number);
                      })
                      .catch(() => toast.error("Table introuvable"));
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu — hide when showing order tracking */}
      {!orderSuccess && (
        <div className="max-w-lg mx-auto px-4 mt-6">
          {restaurant.menu?.map((cat) => (
            <div key={cat._id} className="mb-8">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-emerald-100 text-lg flex items-center justify-center shadow-sm">
                  {dishEmoji(cat.name)}
                </span>
                <h2 className="text-base font-bold text-gray-900">{cat.name}</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">
                  {cat.items?.length || 0} plat
                  {cat.items?.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2.5">
                {cat.items?.map((item) => {
                  const inCart = qtyOf(item._id) > 0;
                  return (
                    <div
                      key={item._id}
                      className="animate-fade-up bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-emerald-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <p className="font-bold text-emerald-700">
                            {item.price.toFixed(2)} €
                          </p>
                          {item.prepTimeMinutes > 0 && (
                            <span className="text-[11px] text-gray-400">
                              · {item.prepTimeMinutes} min
                            </span>
                          )}
                        </div>
                        {item.avgRating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-400 text-xs tracking-tight">
                              {"★".repeat(Math.round(item.avgRating))}
                              {"☆".repeat(5 - Math.round(item.avgRating))}
                            </span>
                            <span className="text-xs font-semibold text-gray-700">
                              {item.avgRating}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              ({item.reviewCount})
                            </span>
                          </div>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg leading-none shadow-sm transition-all active:scale-90"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-gray-800">
                            {qtyOf(item._id)}
                          </span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg leading-none shadow-sm transition-all active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xl flex items-center justify-center shadow-sm transition-all active:scale-90"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {restaurant.menu?.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              Le menu est en cours de préparation...
            </p>
          )}
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col sm:rounded-l-3xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Panier</h2>
              <button
                onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 && (
                <p className="text-gray-400 text-center py-8">
                  Votre panier est vide
                </p>
              )}
              {cart.map((item) => (
                <div key={item.menuItemId} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="font-semibold text-gray-900">
                      {(item.price * item.quantity).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 text-sm hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 text-sm hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                      +
                    </button>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) =>
                        updateNotes(item.menuItemId, e.target.value)
                      }
                      placeholder="Notes..."
                      className="flex-1 ml-2 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className="font-bold text-xl text-emerald-700">
                    {total.toFixed(2)} €
                  </span>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={!tableId || orderMutation.isPending}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold disabled:opacity-50 transition-colors"
                >
                  {orderMutation.isPending ? "Envoi..." : "Confirmer la commande"}
                </button>
                {!tableId && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    Veuillez d'abord sélectionner une table
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating cart bar */}
      {!orderSuccess && cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-xl shadow-emerald-600/30 py-3.5 px-5 flex items-center justify-between font-semibold transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-white text-emerald-700 text-xs font-bold flex items-center justify-center">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
                Voir le panier
              </span>
              <span className="flex items-center gap-1.5">
                {total.toFixed(2)} € <span>→</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
