export default function SearchForm({ query, loading, onQueryChange, onSearch }) {
  function handleKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSearch();
  }

  function handleInput(event) {
    event.currentTarget.style.height = "auto";
    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
    onQueryChange(event.currentTarget.value);
  }

  return (
    <div className="search-panel">
      <textarea
        rows="2"
        aria-label="Search query"
        value={query}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />
      <button type="button" onClick={onSearch} disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>
    </div>
  );
}
