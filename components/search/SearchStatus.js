export default function SearchStatus({ status }) {
  if (!status?.message) return null;
  return (
    <section className="grid" aria-live="polite">
      <div className={`card compact-card${status.error ? " error" : ""}`}>{status.message}</div>
    </section>
  );
}
