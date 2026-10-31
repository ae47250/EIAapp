// Observation values must be numeric before JavaScript coercion: null, blanks,
// booleans and containers are not reported zeroes.
export function numericValue(value) {
  if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && !value.trim()) return Number.NaN;
  return Number(value);
}

export function formatNumber(value) {
  const number = numericValue(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, Math.abs(number)>=1000?{maximumFractionDigits:0}:{maximumSignificantDigits:4})
    : "";
}

export function formatCoverage(coverage) {
  if (!coverage) return "Not available";
  return coverage.start === coverage.end
    ? `${coverage.start} (${coverage.count} obs.)`
    : `${coverage.start}-${coverage.end} (${coverage.count} obs.)`;
}

export function formatCoverageParts(coverage) {
  if (!coverage) return { range: "Not available", count: "" };
  return {
    range: coverage.start === coverage.end ? String(coverage.start) : `${coverage.start}-${coverage.end}`,
    count: `(${coverage.count} obs.)`
  };
}

export function formatLatestValue(value) {return formatNumber(value);}
export function formatLineChartValue(value) {return Number.isFinite(numericValue(value))?formatNumber(value):'Not available';}

export function getCleanPoints(points) {
  return (points || []).filter(point=>point.value!==null && point.value!==undefined && String(point.value).trim()!=='')
    .map(point => ({ period: String(point.period || ""), value: numericValue(point.value) }))
    .filter(point => point.period && Number.isFinite(point.value));
}

export function getRecentYears(points, yearCount) {
  const cleanPoints = (points || [])
    .map(point => ({ ...point, period: String(point.period || ""), year: getPeriodYear(point.period) }))
    .filter(point => point.period && Number.isFinite(numericValue(point.value)));
  if (cleanPoints.length === 0) return [];

  const validYears = cleanPoints.map(point => point.year).filter(Number.isFinite);
  if (validYears.length === 0) return cleanPoints.slice(-yearCount);

  const latestYear = Math.max(...validYears);
  const firstYear = latestYear - yearCount + 1;
  return cleanPoints.filter(point => Number.isFinite(point.year) && point.year >= firstYear && point.year <= latestYear);
}

export function getPeriodYear(period) {
  const match = String(period || "").match(/\d{4}/);
  return match ? Number(match[0]) : Number.NaN;
}

export function getXAxisLabelIndexes(points) {
  const cleanPoints = points || [];
  if (cleanPoints.length <= 2) return cleanPoints.map((_, index) => index);

  const intervalYears = cleanPoints.length > 30 ? 10 : 5;
  const indexes = new Set([0, cleanPoints.length - 1]);
  const startYear = getPeriodYear(cleanPoints[0]?.period);
  const seenYears = new Set();

  cleanPoints.forEach((point, index) => {
    const year = getPeriodYear(point.period);
    if (!Number.isFinite(year) || seenYears.has(year)) return;
    seenYears.add(year);
    if (Number.isFinite(startYear) && (year - startYear) % intervalYears === 0) indexes.add(index);
  });

  return Array.from(indexes).sort((left, right) => left - right);
}
