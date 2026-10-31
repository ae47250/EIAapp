// Copyright 2026 Casey Hand @cyanheads
// SPDX-License-Identifier: Apache-2.0
// Adapted from eia-energy-mcp-server, commit 2dcee105e54b44c1177e01d59a8e62512f8f5f26.
// JavaScript adaptation: period validation and frequency-aware bound ordering only.
const pattern = /^(\d{4})(?:-Q(\d)|-(\d{2})(?:-(\d{2})(?:T(\d{1,3})([+-]\d{2})?)?)?)?$/;
const dayMs = 86400000;
function lex(value) {
  if (typeof value !== 'string' || value.length > 17) return null;
  const match = pattern.exec(value);
  if (!match) return null;
  const [, year, quarter, month, day, hour, offset] = match;
  return { year, quarter, month, day, hour, offset };
}
function impossible(b) {
  if (b.month !== undefined) {
    const m = Number(b.month), y = Number(b.year);
    if (m < 1 || m > 12) return true;
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const last = m === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
    if (b.day !== undefined && (Number(b.day) < 1 || Number(b.day) > last)) return true;
  }
  return b.hour !== undefined && (b.hour.length !== 2 || Number(b.hour) > 23);
}
function parse(b) {
  if (impossible(b)) return null;
  const q = b.quarter === undefined ? null : Number(b.quarter);
  if (q !== null && (q < 1 || q > 4)) return null;
  return { year: Number(b.year), month: q === null ? Number(b.month || 1) : q * 3 - 2,
    day: Number(b.day || 1), hour: b.hour === undefined ? null : Number(b.hour),
    offset: b.offset === undefined ? null : Number(b.offset) };
}
function position(b, side, frequency) {
  if (frequency === 'annual') return b.year;
  if (frequency === 'quarterly') return b.year * 4 + Math.ceil(b.month / 3) - 1;
  if (frequency === 'monthly') return b.year * 12 + b.month - 1;
  if (frequency === 'daily' || frequency === 'weekly') return Date.UTC(b.year, b.month - 1, b.day) / dayMs;
  if (frequency === 'hourly') {
    const h = b.hour !== null && b.offset === null ? b.hour : side === 'start' ? 0 : 23;
    return Date.UTC(b.year, b.month - 1, b.day, h) / 3600000;
  }
  if (frequency === 'local-hourly' && b.hour !== null && b.offset !== null)
    return Date.UTC(b.year, b.month - 1, b.day, b.hour) / 3600000 - b.offset;
  return null;
}
export function periodBoundProblem({ start, end, frequency }) {
  const bounds = {};
  for (const [side, value] of [['start', start], ['end', end]]) {
    if (value === undefined || value === null || value === '') continue;
    const b = lex(value);
    if (!b || (b.quarter !== undefined && !['1','2','3','4'].includes(b.quarter))) return 'invalid_period';
    if (frequency === 'local-hourly' && b.offset === undefined) return 'invalid_period';
    // Preserve the upstream distinction: EIA reads other shapes leniently.
    const strict = ['daily','weekly'].includes(frequency) ? b.day !== undefined && b.hour === undefined
      : frequency === 'hourly' ? b.hour !== undefined && b.offset === undefined
      : frequency === 'local-hourly' ? b.hour !== undefined && b.offset !== undefined : false;
    if (strict && impossible(b)) return 'invalid_period';
    bounds[side] = parse(b);
  }
  const a = bounds.start, b = bounds.end;
  if (a && b && ((a.offset === null) === (b.offset === null))) {
    const from = position(a, 'start', frequency), to = position(b, 'end', frequency);
    if (from !== null && to !== null && from > to) return 'inverted_period_range';
  }
  return null;
}
