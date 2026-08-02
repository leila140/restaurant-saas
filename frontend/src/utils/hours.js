export const DAY_LABELS = [
  "Dim.",
  "Lun.",
  "Mar.",
  "Mer.",
  "Jeu.",
  "Ven.",
  "Sam.",
];

function toMinutes(t) {
  const parts = String(t || "00:00").split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

function getSchedule(openingHours, date = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return null;
  return openingHours.find((s) => s.day === date.getDay()) || null;
}

export function isOpenNow(openingHours, date = new Date()) {
  const s = getSchedule(openingHours, date);
  if (!s) return true;
  if (s.closed) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= toMinutes(s.open) && now < toMinutes(s.close);
}

export function todayStatus(openingHours, date = new Date()) {
  const s = getSchedule(openingHours, date);
  if (!s) return { open: true, label: "" };
  if (s.closed) return { open: false, label: "Fermé aujourd'hui" };
  const now = date.getHours() * 60 + date.getMinutes();
  const openM = toMinutes(s.open);
  const closeM = toMinutes(s.close);
  if (now < openM) return { open: false, label: `Ouvre à ${s.open}` };
  if (now < closeM) return { open: true, label: `Ouvert · jusqu'à ${s.close}` };
  return { open: false, label: `Fermé · ouvre à ${s.open}` };
}
