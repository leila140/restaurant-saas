import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { SkeletonCard } from "./Skeleton";

const fmt = (n) => `${Number(n || 0).toFixed(2)} €`;

const paymentLabels = { cash: "Espèces", card: "Carte" };

export default function ReceiptModal({ receiptNumber, onClose }) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["orders", restaurantId, "receipt", receiptNumber],
    queryFn: () =>
      api.get(`/orders/receipt/${receiptNumber}`).then((r) => r.data),
    enabled: !!restaurantId && !!receiptNumber,
  });

  const paidAt = receipt?.paidAt
    ? new Date(receipt.paidAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Ticket de caisse</h2>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl leading-none hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <SkeletonCard />
          ) : !receipt ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Ticket introuvable
            </p>
          ) : (
            <div
              id="receipt-print"
              className="bg-white text-gray-800 text-sm font-mono p-4"
            >
              <div className="text-center mb-3">
                <p className="text-base font-bold">
                  {receipt.restaurant?.name || "Restaurant"}
                </p>
                {receipt.restaurant?.address && (
                  <p className="text-xs">{receipt.restaurant.address}</p>
                )}
                {receipt.restaurant?.phone && (
                  <p className="text-xs">{receipt.restaurant.phone}</p>
                )}
              </div>

              <div className="text-xs space-y-0.5 mb-3 border-t border-dashed border-gray-300 pt-3">
                <div className="flex justify-between">
                  <span>Ticket N°</span>
                  <span className="font-bold">
                    {String(receipt.receiptNumber).padStart(4, "0")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Table</span>
                  <span>{receipt.tableNumber ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{paidAt}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paiement</span>
                  <span>{paymentLabels[receipt.paymentMethod] || receipt.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 py-2">
                {receipt.orders?.map((order) =>
                  order.items?.map((item, i) => (
                    <div
                      key={`${order._id}-${i}`}
                      className="flex justify-between py-0.5"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="tabular-nums">
                        {(item.price * item.quantity).toFixed(2)} €
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
                </div>
                {receipt.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Remise ({receipt.discountPercent}%)</span>
                    <span className="tabular-nums">
                      − {fmt(receipt.discountAmount)}
                    </span>
                  </div>
                )}
                {receipt.tip > 0 && (
                  <div className="flex justify-between">
                    <span>Pourboire</span>
                    <span className="tabular-nums">+ {fmt(receipt.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{fmt(receipt.total)}</span>
                </div>
              </div>

              <p className="text-center text-xs mt-4 text-gray-500">
                Merci de votre visite !
              </p>
            </div>
          )}
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Fermer
          </button>
          <button
            onClick={() => window.print()}
            disabled={!receipt}
            className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            🖨️ Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}
