export default function ComparisonGroups({ definitions, onSelect, onDownload, onDownloadAll }) {
  if (!Array.isArray(definitions) || definitions.length === 0) return null;

  return (
    <article className="card comparison-groups-card">
      <div className="comparison-card-heading">
        <div>
          <h2 className="result-card-title">Choose a Variable Definition</h2>
          <p className="muted">Each variable is ranked once. Selecting it loads the same definition for every requested country.</p>
        </div>
        <button className="ghost-button comparison-download-all" type="button" onClick={onDownloadAll}>Excel: all ranked variables</button>
      </div>

      {definitions.map(definition => (
        <section className="comparison-definition" key={definition.definitionId}>
          <div className="comparison-definition-heading">
            <div>
              <span className="comparison-rank">Rank {definition.rank}</span>
              <h3>{definition.title}</h3>
              <div className="muted">
                {definition.definition?.frequency || "Frequency unknown"} · {definition.availableCountryCount} of {definition.requestedCountryCount} countries available
              </div>
            </div>
            <div className="variable-actions">
              <button className="ghost-button graph-button" type="button" onClick={() => onSelect(definition)}>Graph all countries</button>
              <button className="ghost-button" type="button" onClick={() => onDownload(definition)}>Excel all countries</button>
            </div>
          </div>
          <div className="comparison-country-list">
            <div className="comparison-country-header" aria-hidden="true">
              <span>Country</span>
              <span>Identified series</span>
              <span>Status</span>
              <span>Coverage</span>
              <span>Units</span>
            </div>
            {definition.countries.map(country => (
              <div className={`comparison-country-row status-${country.status}`} key={country.geography.code}>
                <strong>{country.geography.name}</strong>
                <span className="comparison-series">
                  <span>{country.title || definition.title}</span>
                  <code>{country.seriesId || "Series unavailable"}</code>
                </span>
                <span>{statusLabel(country.status)}</span>
                <span>{country.coverage}</span>
                <span>{country.unit || "Unit unavailable"}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}

function statusLabel(value) {
  return String(value || "unknown").replaceAll("_", " ").replace(/^\w/, character => character.toUpperCase());
}
