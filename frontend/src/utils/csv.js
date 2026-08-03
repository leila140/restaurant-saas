const escapeValue = (value) => {
  const text = value == null ? "" : String(value);
  if (/[;"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export function downloadCSV(filename, headers, rows) {
  const content = [headers, ...rows]
    .map((row) => row.map(escapeValue).join(";"))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatMoney(value) {
  return Number(value || 0).toFixed(2).replace(".", ",") + " €";
}
