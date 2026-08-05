import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { SkeletonCard } from "./Skeleton";

const fmt = (n) => `${Number(n || 0).toFixed(2)} €`;
const toLocalInput = (d) => {
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayStr = toLocalInput(new Date());

const formatLongDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function DailyReportModal({ onClose }) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const [date, setDate] = useState(todayStr);

  const { data: report, isLoading } = useQuery({
    queryKey: ["orders", restaurantId, "report", date],
    queryFn: () =>
      api
        .get("/orders/report", { params: { date } })
        .then((r) => r.data),
    enabled: !!restaurantId && !!date,
  });

  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurant", "me"],
    queryFn: () => api.get("/restaurants/me").then((r) => r.data),
    enabled: !!restaurantId,
  });

  const generatedAt = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";

  const totalByTable = report?.byTable?.reduce(
    (s, t) => s + t.amount,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print, #report-print * { visibility: visible; }
          #report-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800">Rapport de caisse</h2>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm [color-scheme:light]"
            />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl leading-none hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <SkeletonCard />
          ) : !report ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Rapport indisponible
            </p>
          ) : (
            <div id="report-print" className="bg-white text-gray-900">
              <div className="text-center mb-4">
                <p className="text-lg font-bold">
                  {restaurantInfo?.name || "Restaurant"}
                </p>
                <p className="text-xs text-gray-500">
                  {restaurantInfo?.address || ""}
                </p>
                <p className="text-sm font-semibold mt-2 uppercase tracking-wide">
                  Rapport de caisse
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {formatLongDate(report.date)}
                </p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 text-center mb-4">
                <p className="text-xs uppercase tracking-wider text-emerald-700">
                  Total encaissé
                </p>
                <p className="text-3xl font-bold text-emerald-900 tabular-nums">
                  {fmt(report.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Édité le {generatedAt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Espèces</p>
                  <p className="text-lg font-bold tabular-nums">
                    {fmt(report.byPaymentMethod?.cash?.amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {report.byPaymentMethod?.cash?.count} ticket(s)
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Carte</p>
                  <p className="text-lg font-bold tabular-nums">
                    {fmt(report.byPaymentMethod?.card?.amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {report.byPaymentMethod?.card?.count} ticket(s)
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tickets émis</span>
                  <span className="font-semibold tabular-nums">
                    {report.ticketCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Panier moyen</span>
                  <span className="font-semibold tabular-nums">
                    {fmt(report.averageTicket)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Commandes</span>
                  <span className="font-semibold tabular-nums">
                    {report.orderCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Articles servis</span>
                  <span className="font-semibold tabular-nums">
                    {report.itemCount}
                  </span>
                </div>
                {report.discountTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remises accordées</span>
                    <span className="font-semibold tabular-nums">
                      − {fmt(report.discountTotal)}
                    </span>
                  </div>
                )}
                {report.tipTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pourboires</span>
                    <span className="font-semibold tabular-nums">
                      + {fmt(report.tipTotal)}
                    </span>
                  </div>
                )}
                {report.cancelledCount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Commandes annulées</span>
                    <span className="font-semibold tabular-nums">
                      {report.cancelledCount} · {fmt(report.cancelledValue)}
                    </span>
                  </div>
                )}
              </div>

              {report.byTable?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                    Détail par table
                  </p>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {report.byTable.map((t) => (
                      <div
                        key={t.tableNumber ?? "x"}
                        className="flex items-center justify-between px-3 py-2 text-sm odd:bg-gray-50"
                      >
                        <span className="text-gray-600">
                          Table {t.tableNumber ?? "—"}
                          <span className="text-gray-400 text-xs ml-1.5">
                            · {t.orders} commande(s)
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums">
                          {fmt(t.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 text-sm border-t bg-emerald-50">
                      <span className="font-medium text-emerald-800">
                        Total
                      </span>
                      <span className="font-bold text-emerald-900 tabular-nums">
                        {fmt(totalByTable)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-3">
                Clôture de caisse · Bonne soirée !
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
            disabled={!report}
            className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            🖨️ Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}
