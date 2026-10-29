import { downloadComparisonWorkbook } from "../../lib/client/xlsx.js";
import { chartCountries, observationRows, TOP_TEN_NOTE } from "../../lib/client/lookup-display.js";
import SelectedSeries from "./SelectedSeries.js";
import ComparisonChart from "./ComparisonChart.js";

export default function SelectedComparison({ comparison, source }) {
  if (!comparison) return null;
  const chart = comparison.lookup ? {...comparison,countries:chartCountries(comparison.countries)} : comparison;

  return (
    <article className="card selected-comparison-card">
      <div className="selected-series-heading">
        <h2>{comparison.lookup ? comparison.title : `Rank ${comparison.rank}: ${comparison.title}`}</h2>
      </div>
      <div className="selected-source">Source: {source || "EIA"}</div>
      {comparison.warnings?.length ? (
        <ul className="candidate-warning-list">
          {comparison.warnings.map(warning => <li key={`${warning.geographyCode}-${warning.code}`}>{warning.message}</li>)}
        </ul>
      ) : null}
      {comparison.lookup ? (
        <>
          {comparison.countries.filter(country => country.series).map(country => (
            <div className="muted" key={country.geography.code}>
              <p><strong>{country.geography.name}:</strong> {country.series.title}. {country.series.description}</p>
              <p>Measurement basis: {country.series.basisLabel}. {country.series.sectorLabel}. Units: {country.series.unit}. Frequency: {country.series.frequency}.</p>
              {country.series.otherMeasuresExist ? <p>Other measures exist</p> : null}
              {country.series.regionLabel ? <p>{country.series.regionLabel}</p> : null}
              {country.series.fallbackLabel ? <p>{country.series.fallbackLabel}</p> : null}
              {country.series.alternative ? <p>Alternative selected: {country.series.basisLabel}. This differs from the original request.</p> : null}
              {country.series.completenessNote ? <p role="status">{country.series.completenessNote}</p> : null}
            </div>
          ))}
          <button className="ghost-button" type="button" onClick={() => downloadComparisonWorkbook([comparison])}>Excel</button>
        </>
      ) : null}
      {comparison.lookup && comparison.countries.length > 10 ? <p role="status">{TOP_TEN_NOTE}</p> : null}
      {comparison.chartCompatible === false
        ? chart.countries.filter(country => country.series).map(country => <SelectedSeries key={country.geography.code} series={country.series} source={source} />)
        : <ComparisonChart comparison={chart} />}
      {comparison.lookup ? <div className="table-wrap"><table aria-label="All country observations">
        <thead><tr><th>Period</th>{comparison.countries.map(c=><th key={c.geography.code}>{c.geography.name}{c.series ? ` (${c.series.unit})` : ""}</th>)}</tr></thead>
        <tbody>{observationRows(comparison.countries).map(row=><tr key={row.period}><td>{row.period}</td>{row.values.map((value,i)=><td key={comparison.countries[i].geography.code}>{value ?? "Unavailable"}</td>)}</tr>)}</tbody>
      </table></div> : null}
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
