import ComparisonChart from "./ComparisonChart.js";

export default function SelectedComparison({ comparison, source }) {
  if (!comparison) return null;

  return (
    <article className="card selected-comparison-card">
      <div className="selected-series-heading">
        <h2>Rank {comparison.rank}: {comparison.title}</h2>
      </div>
      <div className="selected-source">Source: {source || "EIA"}</div>
      {comparison.warnings?.length ? (
        <ul className="candidate-warning-list">
          {comparison.warnings.map(warning => <li key={`${warning.geographyCode}-${warning.code}`}>{warning.message}</li>)}
        </ul>
      ) : null}
      <ComparisonChart comparison={comparison} />
      <div className="table-wrap">
        <table className="comparison-status-table">
          <thead><tr><th>Country</th><th>Status</th><th>Series</th><th>Coverage</th><th>Units</th></tr></thead>
          <tbody>
            {comparison.countries.map(country => (
              <tr key={country.geography.code}>
                <td><strong>{country.geography.name}</strong></td>
                <td>{statusLabel(country.status)}</td>
                <td>{country.seriesId || "Unavailable"}</td>
                <td>{country.series ? `${country.series.coverage.start} to ${country.series.coverage.end}` : country.coverage}</td>
                <td>{country.series?.unit || country.unit || "Unavailable"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function statusLabel(value) {
  return String(value || "unknown").replaceAll("_", " ").replace(/^\w/, character => character.toUpperCase());
}
