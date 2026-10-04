import type { TFunction } from 'i18next';

import type { ExpenseCategory, RecordKind } from '@/features/records/api';
import { lookupName } from '@/features/vehicles/lookups';
import { formatDate } from '@/lib/dates';
import { currencyLabel, formatMoney, formatNumber } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type LookupName = { name_en: string; name_ar: string | null };

/** One record, flattened for export. */
export type ExportRow = {
  kind: RecordKind;
  date: string;
  odometer: number | null;
  amount: number;
  /** Maintenance only: the labor part of `amount`. */
  labor: number | null;
  liters: number | null;
  pricePerLiter: number | null;
  place: string | null;
  notes: string | null;
  parts: LookupName[];
  expenseCategory: ExpenseCategory | null;
};

export type Period = { from: string | null; to: string | null };

/** All records of a vehicle in [from, to), oldest first. */
export async function fetchExportRows(vehicleId: string, { from, to }: Period): Promise<ExportRow[]> {
  const range = <Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(
    query: Q,
    column: string
  ) => {
    let q = query;
    if (from) q = q.gte(column, from);
    if (to) q = q.lt(column, to);
    return q;
  };

  const [fuel, maintenance, expenses] = await Promise.all([
    range(
      supabase
        .from('fuel_entries')
        .select('filled_at, odometer, liters, total_cost, price_per_liter, station, notes')
        .eq('vehicle_id', vehicleId),
      'filled_at'
    ),
    range(
      supabase
        .from('maintenance_records')
        .select('performed_at, odometer, total_cost, labor_cost, workshop, notes, maintenance_items(part_categories(name_en, name_ar))')
        .eq('vehicle_id', vehicleId),
      'performed_at'
    ),
    range(
      supabase
        .from('expenses')
        .select('spent_at, category, amount, odometer, notes')
        .eq('vehicle_id', vehicleId),
      'spent_at'
    ),
  ]);
  if (fuel.error) throw fuel.error;
  if (maintenance.error) throw maintenance.error;
  if (expenses.error) throw expenses.error;

  const base = { liters: null, pricePerLiter: null, parts: [], expenseCategory: null, labor: null };
  const rows: ExportRow[] = [
    ...fuel.data.map((f) => ({
      ...base,
      kind: 'fuel' as const,
      date: f.filled_at,
      odometer: f.odometer,
      amount: Number(f.total_cost),
      liters: Number(f.liters),
      pricePerLiter: f.price_per_liter == null ? null : Number(f.price_per_liter),
      place: f.station,
      notes: f.notes,
    })),
    ...maintenance.data.map((m) => ({
      ...base,
      kind: 'maintenance' as const,
      date: m.performed_at,
      odometer: m.odometer,
      amount: Number(m.total_cost),
      labor: Number(m.labor_cost ?? 0),
      place: m.workshop,
      notes: m.notes,
      parts: (m.maintenance_items as unknown as { part_categories: LookupName | null }[])
        .map((i) => i.part_categories)
        .filter((p): p is LookupName => !!p),
    })),
    ...expenses.data.map((e) => ({
      ...base,
      kind: 'expense' as const,
      date: e.spent_at,
      odometer: e.odometer,
      amount: Number(e.amount),
      place: null,
      notes: e.notes,
      expenseCategory: e.category as ExpenseCategory,
    })),
  ];
  return rows.sort((a, b) => a.date.localeCompare(b.date) || (a.odometer ?? 0) - (b.odometer ?? 0));
}

function rowTitle(row: ExportRow, t: TFunction, lang: string) {
  if (row.kind === 'fuel') return t('history.fuelFillUp');
  if (row.kind === 'maintenance') {
    return row.parts.map((p) => lookupName(p, lang)).join(' + ') || t('records.maintenance');
  }
  return t(`expenseCategories.${row.expenseCategory}`);
}

const csvCell = (value: string | number | null) => {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV with a UTF-8 BOM so Excel shows Arabic text correctly. */
export function buildCsv(rows: ExportRow[], t: TFunction, lang: string, currency: string) {
  const header = [
    t('export.col.date'),
    t('export.col.type'),
    t('export.col.item'),
    t('export.col.odometer'),
    `${t('export.col.amount')} (${currency})`,
    `${t('export.col.labor')} (${currency})`,
    t('export.col.liters'),
    t('export.col.pricePerLiter'),
    t('export.col.place'),
    t('export.col.notes'),
  ];
  const lines = rows.map((r) =>
    [
      r.date,
      t(`records.${r.kind}`),
      rowTitle(r, t, lang),
      r.odometer,
      r.amount.toFixed(2),
      r.labor != null ? r.labor.toFixed(2) : null,
      r.liters,
      r.pricePerLiter,
      r.place,
      r.notes,
    ]
      .map(csvCell)
      .join(',')
  );
  return '﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n');
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type ReportInput = {
  rows: ExportRow[];
  vehicleName: string;
  plate: string | null;
  periodLabel: string;
  currency: string;
  t: TFunction;
  lang: string;
};

/** Self-contained HTML report (inline CSS, no images) for expo-print / the browser print dialog. */
export function buildReportHtml({ rows, vehicleName, plate, periodLabel, currency, t, lang }: ReportInput) {
  const rtl = lang === 'ar';
  const money = (v: number) => escapeHtml(formatMoney(v, currency, lang));
  const byKind: Record<RecordKind, number> = { maintenance: 0, fuel: 0, expense: 0 };
  for (const r of rows) byKind[r.kind] += r.amount;
  const labor = rows.reduce((sum, r) => sum + (r.labor ?? 0), 0);
  const total = byKind.maintenance + byKind.fuel + byKind.expense;

  const withKm = rows.filter((r) => r.odometer != null);
  const distance = withKm.length > 1 ? withKm.at(-1)!.odometer! - withKm[0]!.odometer! : 0;
  const fuelRows = rows.filter((r) => r.kind === 'fuel');
  const liters = fuelRows.reduce((s, r) => s + (r.liters ?? 0), 0);
  const prices = fuelRows.map((r) => r.pricePerLiter).filter((p): p is number => p != null);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  const categories: { label: string; value: number }[] = [
    { label: t('insights.spareParts'), value: byKind.maintenance - labor },
    { label: t('insights.labor'), value: labor },
    { label: t('insights.fuel'), value: byKind.fuel },
    { label: t('insights.otherExpenses'), value: byKind.expense },
  ];

  const tile = (label: string, value: string) =>
    `<div class="tile"><div class="label">${escapeHtml(label)}</div><div class="value">${value}</div></div>`;

  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title></title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; color: #18272a; margin: 28px; font-size: 12px; }
  header { background: #023a22; color: #e6f5ec; border-radius: 14px; padding: 18px 22px; }
  header h1 { margin: 0; font-size: 20px; }
  header p { margin: 4px 0 0; opacity: .85; }
  .tiles { display: flex; gap: 10px; margin: 18px 0; }
  .tile { flex: 1; border: 1px solid #e1e8e5; border-radius: 12px; padding: 12px; }
  .label { color: #698078; font-size: 11px; }
  .value { font-size: 18px; font-weight: 600; margin-top: 4px; }
  h2 { font-size: 14px; margin: 20px 0 8px; }
  .bar { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .bar .name { width: 120px; }
  .bar .track { flex: 1; height: 8px; background: #e0eae5; border-radius: 8px; overflow: hidden; }
  .bar .fill { height: 100%; background: #218466; border-radius: 8px; }
  .bar .amount { width: 110px; text-align: end; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: start; padding: 6px 8px; border-bottom: 1px solid #e1e8e5; vertical-align: top; }
  th { color: #698078; font-weight: 500; font-size: 11px; }
  td.num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
  footer { margin-top: 24px; color: #698078; font-size: 10px; text-align: center; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(t('export.reportTitle'))} · ${escapeHtml(vehicleName)}</h1>
    <p>${escapeHtml(periodLabel)}${plate ? ` · ${escapeHtml(plate)}` : ''}</p>
  </header>

  <div class="tiles">
    ${tile(t('insights.totalSpend'), money(total))}
    ${tile(t('insights.distance'), `${escapeHtml(formatNumber(distance, lang))} ${escapeHtml(t('vehicles.kmUnit'))}`)}
    ${tile(t('fuel.costPerKm'), distance > 0 ? `${escapeHtml(formatNumber(total / distance, lang, 2))} ${escapeHtml(currencyLabel(currency, lang))}` : '—')}
  </div>
  <div class="tiles">
    ${tile(t('export.fillUps'), escapeHtml(formatNumber(fuelRows.length, lang)))}
    ${tile(t('export.totalLiters'), `${escapeHtml(formatNumber(liters, lang, 1))} ${escapeHtml(t('fuel.literUnit'))}`)}
    ${tile(t('fuel.avgPrice'), avgPrice != null ? money(avgPrice) : '—')}
  </div>

  <h2>${escapeHtml(t('insights.byCategory'))}</h2>
  ${categories
    .map(
      (c) => `<div class="bar"><span class="name">${escapeHtml(c.label)}</span>
      <span class="track"><span class="fill" style="display:block;width:${total > 0 ? Math.round((c.value / total) * 100) : 0}%"></span></span>
      <span class="amount">${money(c.value)}</span></div>`
    )
    .join('')}

  <h2>${escapeHtml(t('export.records', { count: rows.length }))}</h2>
  <table>
    <thead><tr>
      <th>${escapeHtml(t('export.col.date'))}</th>
      <th>${escapeHtml(t('export.col.item'))}</th>
      <th>${escapeHtml(t('export.col.odometer'))}</th>
      <th>${escapeHtml(t('export.col.place'))}</th>
      <th>${escapeHtml(t('export.col.amount'))}</th>
    </tr></thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr>
        <td class="num">${escapeHtml(formatDate(r.date, lang, true))}</td>
        <td>${escapeHtml(rowTitle(r, t, lang))}${r.liters != null ? ` · ${escapeHtml(formatNumber(r.liters, lang, 1))} ${escapeHtml(t('fuel.literUnit'))}` : ''}</td>
        <td class="num">${r.odometer != null ? escapeHtml(formatNumber(r.odometer, lang)) : ''}</td>
        <td>${escapeHtml(r.place ?? r.notes ?? '')}</td>
        <td class="num">${money(r.amount)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <footer>Car Care · ${escapeHtml(formatDate(new Date().toISOString().slice(0, 10), lang, true))}</footer>
</body>
</html>`;
}
