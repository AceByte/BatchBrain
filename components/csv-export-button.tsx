"use client"

export function CsvExportButton({ filename, headers, rows, label = "Export CSV" }: {
  filename: string
  headers: string[]
  rows: (string | number | null)[][]
  label?: string
}) {
  function exportCsv() {
    const escapeCell = (value: string | number | null) => {
      const text = value === null ? "" : String(value)
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
    }
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n")
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return <button type="button" className="btn-secondary" onClick={exportCsv}>{label}</button>
}
