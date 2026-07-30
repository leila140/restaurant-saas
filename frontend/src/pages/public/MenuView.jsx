import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../services/api";
import Confetti from "../../components/Confetti";
import OrderTracking from "../../components/OrderTracking";

export default function MenuView() {
  const { slug, token } = useParams();
  const [cart, setCart] = useState([]);
  const [tableId, setTableId] = useState(null);
  const [tableNumber, setTableNumber] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Auto-resolve table from QR token in URL
  useQuery({
    queryKey: ["table-by-token", token],
    queryFn: () =>
      api.get(`/tables/token/${token}`).then((r) => {
        setTableId(r.data._id);
        setTableNumber(`Table ${r.data.number}`);
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
      setCart([]);
      setShowCart(false);
      setOrderSuccess(true);
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 4000);
    },
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{restaurant.name}</h1>
            {tableNumber && (
              <p className="text-sm text-gray-500">Table {tableNumber}</p>
            )}
          </div>
          {!orderSuccess && (
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-gray-900 text-white px-4 py-2 rounded-lg text-sm"
            >
              Panier
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confetti */}
      <Confetti active={confettiActive} />

      {/* Order tracking / Success */}
      {orderSuccess && lastOrder && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <OrderTracking
            orderId={lastOrder._id}
            restaurantId={restaurant._id}
            currentStatus={lastOrder.status}
            tableNumber={tableNumber}
            total={lastOrder.totalPrice}
            items={lastOrder.items}
          />
          <button
            onClick={() => {
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
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-2">Scannez le QR code sur votre table</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={tableNumber || ""}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ou entrez le token manuellement"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  if (tableNumber) {
                    api
                      .get(`/tables/token/${tableNumber}`)
                      .then((r) => {
                        setTableId(r.data._id);
                        setTableNumber(`Table ${r.data.number}`);
                      })
                      .catch(() => alert("Table introuvable"));
                  }
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu — hide when showing order tracking */}
      {!orderSuccess && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          {restaurant.menu?.map((cat) => (
            <div key={cat._id} className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3 sticky top-16 bg-gray-50 py-1">
                {cat.name}
              </h2>
              <div className="space-y-2">
                {cat.items?.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {item.price.toFixed(2)} €
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Panier</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 text-2xl"
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
                <div key={item.menuItemId} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="font-semibold">
                      {(item.price * item.quantity).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 bg-gray-200 rounded-full text-sm"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 bg-gray-200 rounded-full text-sm"
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
                      className="flex-1 ml-2 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t">
                <div className="flex justify-between mb-3">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-lg">{total.toFixed(2)} €</span>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={!tableId || orderMutation.isPending}
                  className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium disabled:opacity-50"
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
    </div>
  );
}
