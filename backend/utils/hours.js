const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const DAYS_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

function toMinutes(t) {
  const parts = String(t || "00:00").split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function getSchedule(openingHours, date = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return null;
  const day = date.getDay();
  return openingHours.find((s) => s.day === day) || null;
}

function isOpenNow(openingHours, date = new Date()) {
  const schedule = getSchedule(openingHours, date);
  if (!schedule) return true;
  if (schedule.closed) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= toMinutes(schedule.open) && now < toMinutes(schedule.close);
}

function getTodayLabel(openingHours, date = new Date()) {
  const schedule = getSchedule(openingHours, date);
  if (!schedule) return "";
  if (schedule.closed) return "Fermé aujourd'hui";
  return `Ouvert de ${schedule.open} à ${schedule.close}`;
}

module.exports = { DAYS, DAYS_SHORT, isOpenNow, getTodayLabel, getSchedule };
