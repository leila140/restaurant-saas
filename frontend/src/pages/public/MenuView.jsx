import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import Confetti from "../../components/Confetti";
import OrderTracking from "../../components/OrderTracking";

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

  const initial = (restaurant.name || "R").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-lg mx-auto px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-emerald-900 text-white flex items-center justify-center font-display text-sm font-semibold">
              {initial}
            </span>
            <div>
              <h1 className="font-display text-lg font-semibold text-stone-900 leading-tight">
                {restaurant.name}
              </h1>
              {tableNumber && (
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-800 font-semibold">
                  Table {tableNumber}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Intro */}
      {!orderSuccess && (
        <div className="max-w-lg mx-auto px-5 pt-10 pb-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-800 font-semibold">
            {tableNumber ? `Bienvenue · Table ${tableNumber}` : "Bienvenue"}
          </p>
          <h2 className="font-display text-3xl font-semibold text-stone-900 mt-3 leading-snug">
            {restaurant.name}
          </h2>
          <p className="text-[15px] text-stone-500 mt-3 leading-relaxed max-w-sm mx-auto">
            Commandez depuis votre table, vos plats arrivent directement en
            cuisine.
          </p>
        </div>
      )}

      {/* Confetti */}
      <Confetti active={confettiActive} />

      {/* Order tracking / Success */}
      {orderSuccess && lastOrder && (
        <div className="max-w-lg mx-auto px-5 mt-4">
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
            className="w-full mt-4 py-2.5 border border-stone-200 text-stone-600 rounded-full text-sm font-medium hover:border-stone-300 hover:text-stone-900 transition-colors"
          >
            Commander à nouveau
          </button>
        </div>
      )}

      {/* Table selection — only show if no QR token in URL */}
      {!tableId && !token && (
        <div className="max-w-lg mx-auto px-5 mt-2">
          <div className="rounded-2xl border border-stone-200 p-5">
            <h2 className="font-display text-xl font-semibold text-stone-900">
              Choisissez votre table
            </h2>
            <p className="text-sm text-stone-500 mt-1 mb-4">
              Scannez le QR code sur votre table ou entrez le token affiché.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tableNumber || ""}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Token de la table"
                className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
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
                className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu — hide when showing order tracking */}
      {!orderSuccess && (
        <div className="max-w-lg mx-auto px-5 mt-4">
          {restaurant.menu?.map((cat) => (
            <section key={cat._id} className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <span className="h-px flex-1 bg-stone-200" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {cat.name}
                </h2>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="divide-y divide-stone-100">
                {cat.items?.map((item) => {
                  const inCart = qtyOf(item._id) > 0;
                  return (
                    <div
                      key={item._id}
                      className="py-4 animate-fade-up"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {item.photo && (
                            <img
                              src={item.photo}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-cover border border-stone-100 shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <h3 className="font-display text-[17px] font-medium text-stone-900 leading-snug">
                                {item.name}
                              </h3>
                              {item.prepTimeMinutes > 0 && (
                                <span className="text-[10px] text-stone-400 whitespace-nowrap">
                                  {item.prepTimeMinutes} min
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[13px] text-stone-500 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            {item.avgRating > 0 && (
                              <p className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                                <span className="text-amber-500 tracking-tight">
                                  {"★".repeat(Math.round(item.avgRating))}
                                  {"☆".repeat(5 - Math.round(item.avgRating))}
                                </span>
                                <span className="font-medium text-stone-600">
                                  {item.avgRating}
                                </span>
                                <span className="text-stone-400">
                                  ({item.reviewCount})
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2.5 shrink-0">
                          <span className="text-[15px] font-semibold text-emerald-900 tabular-nums">
                            {item.price.toFixed(2)} €
                          </span>
                          {inCart ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQuantity(item._id, -1)}
                                className="w-7 h-7 rounded-full border border-stone-200 text-stone-600 text-sm hover:border-emerald-900 hover:text-emerald-900 transition-colors"
                                aria-label="Retirer un"
                              >
                                −
                              </button>
                              <span className="w-4 text-center text-[13px] font-semibold text-stone-800">
                                {qtyOf(item._id)}
                              </span>
                              <button
                                onClick={() => updateQuantity(item._id, 1)}
                                className="w-7 h-7 rounded-full bg-emerald-900 text-white text-sm hover:bg-emerald-800 transition-colors"
                                aria-label="Ajouter un"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              aria-label={`Ajouter ${item.name}`}
                              className="w-7 h-7 rounded-full border border-emerald-900 text-emerald-900 text-base leading-none hover:bg-emerald-900 hover:text-white transition-colors"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {restaurant.menu?.length === 0 && (
            <p className="text-center text-stone-400 py-16 font-display text-lg">
              Le menu est en cours de préparation...
            </p>
          )}
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col sm:rounded-l-3xl">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-stone-900">
                Votre panier
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4 divide-y divide-stone-100">
              {cart.length === 0 && (
                <p className="text-stone-400 text-center py-10 font-display">
                  Votre panier est vide
                </p>
              )}
              {cart.map((item) => (
                <div key={item.menuItemId} className="py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-[15px] font-medium text-stone-900">
                      {item.name}
                    </span>
                    <span className="text-sm font-semibold text-stone-700 tabular-nums whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 rounded-full border border-stone-200 text-stone-600 text-sm hover:border-emerald-900 hover:text-emerald-900 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 rounded-full border border-stone-200 text-stone-600 text-sm hover:border-emerald-900 hover:text-emerald-900 transition-colors"
                    >
                      +
                    </button>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) =>
                        updateNotes(item.menuItemId, e.target.value)
                      }
                      placeholder="Note pour la cuisine..."
                      className="flex-1 ml-2 px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-800/20 placeholder:text-stone-400"
                    />
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-stone-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-stone-500">Total</span>
                  <span className="font-display text-2xl font-semibold text-emerald-900 tabular-nums">
                    {total.toFixed(2)} €
                  </span>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={!tableId || orderMutation.isPending}
                  className="w-full py-3.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full font-semibold disabled:opacity-50 transition-colors"
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
        <div className="fixed bottom-0 inset-x-0 z-20 p-5 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-emerald-900 hover:bg-emerald-800 text-white rounded-full shadow-xl shadow-emerald-900/25 py-3.5 px-6 flex items-center justify-between font-semibold transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-white text-emerald-900 text-xs font-bold flex items-center justify-center">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
                Voir le panier
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                {total.toFixed(2)} € <span aria-hidden>→</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
