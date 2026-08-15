import { ChartValueFormat } from './chart-theme';

/**
 * Formateadores numéricos y de fecha consistentes con las convenciones
 * regionales de Santa Cruz Suite (es-CO): miles con punto, decimales con coma.
 */

const NUMBER = new Intl.NumberFormat('es-CO');
const DECIMAL_1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 28450000 → "28.450.000" */
export function formatNumber(value: number): string {
  return NUMBER.format(Math.round(value));
}

/** 28450000 → "28,5 M" · 1245 → "1.245" · 1250000 → "1,3 M" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${DECIMAL_1.format(value / 1_000_000_000)} B`;
  if (abs >= 1_000_000) return `${DECIMAL_1.format(value / 1_000_000)} M`;
  if (abs >= 10_000) return `${DECIMAL_1.format(value / 1_000)} K`;
  return NUMBER.format(Math.round(value));
}

/** 28450000 → "$ 28,5 M" (compacto, ideal para ejes) */
export function formatCurrencyCompact(value: number): string {
  return `$ ${formatCompact(value)}`;
}

/** 28450000 → "$ 28.450.000" (completo, ideal para tooltips) */
export function formatCurrency(value: number): string {
  return `$ ${formatNumber(value)}`;
}

/** 18.5 → "18,5 %" */
export function formatPercent(value: number, decimals = 1): string {
  const fmt = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${fmt.format(value)} %`;
}

/** 8.5 → "8,5 h" */
export function formatHours(value: number): string {
  return `${DECIMAL_1.format(value)} h`;
}

/** Aplica el formato indicado a un valor para ejes/etiquetas. */
export function formatValue(value: number, format: ChartValueFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrencyCompact(value);
    case 'compact':
      return formatCompact(value);
    case 'percent':
      return formatPercent(value);
    case 'hours':
      return formatHours(value);
    default:
      return formatNumber(value);
  }
}

/** Aplica el formato completo (sin compactar) para tooltips. */
export function formatValueFull(value: number, format: ChartValueFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'hours':
      return formatHours(value);
    default:
      return formatNumber(value);
  }
}

/** "2026-08-14" → "14 ago" (etiqueta corta y consistente para ejes de fecha). */
export function formatDateShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return d
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    .replace('.', '');
}

/** "2026-08-14" → "jueves, 14 de agosto de 2026" (para tooltips). */
export function formatDateLong(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  const s = d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parseo seguro de fechas ISO evitando desfases de zona horaria. */
function parseDate(iso: string): Date | null {
  if (!iso) return null;
  // Fecha pura (YYYY-MM-DD): fijar mediodía local para evitar saltos de día.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(dateOnly ? `${iso}T12:00:00` : iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Variación relativa entre dos valores, en porcentaje (para tooltips). */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
