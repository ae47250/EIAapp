export default function CandidateGroups({ groups, warnings, onSelect, onDownload }) {
  if (!Array.isArray(groups) || groups.length === 0) return null;

  return (
    <article className="card candidate-groups-card">
      <h2 className="result-card-title">Choose an EIA Series</h2>
      <p className="muted">Compatible candidates are grouped by meaning. Aggregation relationships are not verified. No graph or observation data loads until you choose Graph or Excel.</p>
      {warnings?.length ? (
        <ul className="candidate-warning-list">
          {warnings.map(warning => <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>)}
        </ul>
      ) : null}

      {groups.map(group => (
        <section className="candidate-group" key={group.id}>
          <div className="candidate-group-heading">
            <h3>{group.product ? `${titleCase(group.product)}: ` : ""}{group.label}</h3>
            <span>{group.geography?.name || group.geography?.code || ""}</span>
          </div>
          {group.warnings?.some(warning => warning.code.includes("fallback")) ? (
            <div className="candidate-fallback-note">These are labeled fallback choices, not silent substitutes.</div>
          ) : null}
          <div className="table-wrap">
            <table className="candidate-table">
              <thead>
                <tr>
                  <th>Choose</th><th>Series</th><th>Route / tier</th><th>Frequency</th><th>Unit</th><th>Coverage</th><th>Score</th>
                </tr>
              </thead>
              <tbody>
                {group.candidates.map(candidate => (
                  <tr key={candidate.candidateId}>
                    <td>
                      <div className="variable-actions">
                        <button className="ghost-button graph-button" type="button" onClick={() => onSelect(candidate)}>Graph</button>
                        <button className="ghost-button" type="button" onClick={() => onDownload(candidate)}>Excel</button>
                      </div>
                    </td>
                    <td className="variable-name">
                      {candidate.title}
                      {candidate.fallback ? <span className="candidate-badge fallback">Fallback</span> : null}
                      <div className="muted">{certaintySummary(candidate)}</div>
                    </td>
                    <td>{candidate.routeFamily} / {candidate.rankingTier}</td>
                    <td>{candidate.frequency}</td>
                    <td>{candidate.unit}</td>
                    <td>{candidate.coverage}</td>
                    <td>{candidate.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </article>
  );
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, character => character.toUpperCase());
}

function certaintySummary(candidate) {
  const semanticMessage = candidate.certainty?.semanticCompatibility === "compatible"
    ? "Matches your request."
    : "Compatibility has not been verified.";
  const aggregationMessage = candidate.certainty?.aggregationRelation === "verified_aggregate"
    ? "Total/component relationship verified."
    : "Total/component relationship not verified.";
  return `${semanticMessage} ${aggregationMessage}`;
}
