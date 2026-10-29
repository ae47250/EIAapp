export default function LookupChoices({ choices = [], onChoose, disabled }) {
  if (!choices.length) return null;
  return (
    <div className="variable-actions" aria-label="Available choices">
      {choices.map((action,index) => (
        <button className="ghost-button" type="button" disabled={disabled}
          key={`${action.lookupRowKey || action.choice?.value}-${index}`} onClick={() => onChoose(action)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
