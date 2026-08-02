import { useState } from "react";

const fmt = (n) => `${Number(n || 0).toFixed(2)} €`;

export default function CheckoutModal({ bill, isPending, onConfirm, onClose }) {
  const [method, setMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);

  const subtotal = Number(bill.total) || 0;
  const discountPercent = Math.max(0, Math.min(100, Number(discount) || 0));
  const discountAmount =
    Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const tipAmount = Math.max(0, Number(tip) || 0);
  const total = Math.round((subtotal - discountAmount + tipAmount) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Encaisser — Table {bill.tableNumber}
            </h2>
            <p className="text-xs text-gray-400">{bill.count} commande(s)</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl leading-none hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mode de paiement
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "cash", l: "💵 Espèces" },
                { k: "card", l: "💳 Carte" },
              ].map((m) => (
                <button
                  key={m.k}
                  onClick={() => setMethod(m.k)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    method === m.k
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remise (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pourboire (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span className="tabular-nums">{fmt(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Remise ({discountPercent}%)</span>
                <span className="tabular-nums">− {fmt(discountAmount)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Pourboire</span>
                <span className="tabular-nums">+ {fmt(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-200">
              <span className="text-gray-800">Total</span>
              <span className="text-emerald-700 tabular-nums font-display">
                {fmt(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() =>
              onConfirm({
                paymentMethod: method,
                discountPercent: discountPercent,
                tip: tipAmount,
              })
            }
            disabled={isPending}
            className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {isPending ? "Encaissement..." : `Encaisser — ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
