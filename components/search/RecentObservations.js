import { formatNumber, getRecentYears } from "../../lib/client/formatting.js";

export default function RecentObservations({ series }) {
  const points = getRecentYears(series?.points, 4).slice().reverse();
  if (!points.length) return null;

  return (
    <section className="grid">
      <article className="card recent-observations-card">
        <h3 className="result-card-title">Recent Observations</h3>
        <div className="muted">Last 4 years shown. Excel download includes the full selected series.</div>
        <div className="recent-country">{series.country || ""}</div>
        <div className="compact-observations">
          {points.map(point => (
            <div className="compact-observation" key={point.period}>
              <div className="compact-observation-period">{point.period}</div>
              <div className="compact-observation-value">{formatNumber(point.value)}</div>
              <div className="compact-observation-unit">{series.unit}</div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
