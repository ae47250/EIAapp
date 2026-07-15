export default function MatchingVariables({ variables, onSelect, onDownload }) {
  if (!Array.isArray(variables) || variables.length === 0) return null;

  return (
    <article className="card">
      <h2 className="result-card-title">Matching EIA Variables</h2>
      <p className="muted">Click Graph to load another series.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Select</th><th>Country</th><th>Variable</th><th>Coverage</th>
              <th>Frequency</th><th>Unit</th><th>Indicator code</th>
            </tr>
          </thead>
          <tbody>
            {variables.map(variable => (
              <tr key={`${variable.countryCode}-${variable.productId}-${variable.activityId}-${variable.unitFacet}`}>
                <td>
                  <div className="variable-actions">
                    <button className="ghost-button graph-button" type="button" onClick={() => onSelect(variable)}>Graph</button>
                    <button className="ghost-button" type="button" onClick={() => onDownload(variable)}>Excel</button>
                  </div>
                </td>
                <td>{variable.country || ""}</td>
                <td className="variable-name">{variable.label}</td>
                <td>{variable.coverage || ""}</td>
                <td>{variable.frequency || "annual"}</td>
                <td>{variable.unit || ""}</td>
                <td>{variable.productId} / {variable.activityId} / {variable.unitFacet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
