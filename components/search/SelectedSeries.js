import {observationStatus,headlineFor,seriesCardText} from '../../lib/client/lookup-display.js';
import { downloadSeriesWorkbook } from "../../lib/client/xlsx.js";
import { formatCoverageParts, formatLatestValue } from "../../lib/client/formatting.js";
import SeriesChart from "./SeriesChart.js";

export default function SelectedSeries({ series, source }) {
  const card=series.lookup?seriesCardText(series):null;
  const coverage = formatCoverageParts(series.coverage);
  const chartKey = `${series.countryCode}-${series.productId}-${series.activityId}-${series.unitFacet}`;

  return (
    <article className="card">
      <div className="selected-series-heading">
        {card?<h2>{card.title}</h2>:<><h2>{series.placeDisplayName || series.country || ""}</h2><h2>{series.title || ""}</h2></>}
      </div>
      {series.lookup ? <><p data-headline={series.countryCode}>{headlineFor(series)}</p><p data-status-label>{observationStatus(series.points)}</p></> : null}
      <div className="selected-source">Source: {source || "EIA"}</div>
      {series.lookup ? (
        <div className="muted">
          {card.lines.map(line=><p key={line}>{line}</p>)}
          <button className="ghost-button" type="button" onClick={() => downloadSeriesWorkbook(series)}>Excel</button>
        </div>
      ) : null}
      <div className="stats">
        <div className="stat series-stat-card">
          <div className="stats-row">
            <div>
              <div className="stat-label">Coverage</div>
              <div className="stat-value">{coverage.range}{coverage.count ? <><br />{coverage.count}</> : null}</div>
            </div>
            <div><div className="stat-label">Latest Period</div><div className="stat-value">{series.latestPeriod}</div></div>
            <div><div className="stat-label">Latest Value</div><div className="stat-value">{series.lookup && series.latestValue===null ? 'No value' : formatLatestValue(series.latestValue)}</div></div>
            <div><div className="stat-label">Units</div><div className="stat-value">{series.unit}</div></div>
          </div>
        </div>
      </div>
      {!series.lookup || observationStatus(series.points)==='Available'?<SeriesChart key={chartKey} series={series} />:null}
    </article>
  );
}
