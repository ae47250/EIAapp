import { formatCoverageParts, formatLatestValue } from "../../lib/client/formatting.js";
import SeriesChart from "./SeriesChart.js";

export default function SelectedSeries({ series, source }) {
  const coverage = formatCoverageParts(series.coverage);
  const chartKey = `${series.countryCode}-${series.productId}-${series.activityId}-${series.unitFacet}`;

  return (
    <article className="card">
      <div className="selected-series-heading">
        <h2>{series.country || ""}</h2>
        <h2>{series.title || ""}</h2>
      </div>
      <div className="selected-source">Source: {source || "EIA"}</div>
      <div className="stats">
        <div className="stat series-stat-card">
          <div className="stats-row">
            <div>
              <div className="stat-label">Coverage</div>
              <div className="stat-value">{coverage.range}{coverage.count ? <><br />{coverage.count}</> : null}</div>
            </div>
            <div><div className="stat-label">Latest Period</div><div className="stat-value">{series.latestPeriod}</div></div>
            <div><div className="stat-label">Latest Value</div><div className="stat-value">{formatLatestValue(series.latestValue)}</div></div>
            <div><div className="stat-label">Units</div><div className="stat-value">{series.unit}</div></div>
          </div>
        </div>
      </div>
      <SeriesChart key={chartKey} series={series} />
    </article>
  );
}
