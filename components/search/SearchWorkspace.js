"use client";

import { useRef, useState } from "react";

import { downloadSeriesWorkbook } from "../../lib/client/xlsx.js";
import MatchingVariables from "./MatchingVariables.js";
import RecentObservations from "./RecentObservations.js";
import SearchForm from "./SearchForm.js";
import SearchStatus from "./SearchStatus.js";
import SelectedSeries from "./SelectedSeries.js";

const DEFAULT_QUERY = "brazil energy production";

export default function SearchWorkspace({ showLogout }) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const seriesCache = useRef(new Map());

  async function searchEia() {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setStatus({
        error: true,
        message: "Enter a country and variable. Example: Brazil enrgy prducton is acceptable; the search will interpret minor variable typos."
      });
      return;
    }

    setLoading(true);
    setData(null);
    setStatus({ message: "Interpreting query..." });
    try {
      const interpretation = await fetchJson(`/api/interpret-query?${new URLSearchParams({ q: cleanQuery })}`);
      const intent = interpretation.intent;
      setStatus({ message: `${formatInterpreter(intent, cleanQuery)} Searching EIA data...` });
      const params = appendIntentParams(new URLSearchParams({ q: cleanQuery }), intent);
      const nextData = await fetchJson(`/api/search-eia?${params}`);
      applySearchResult(nextData);
    } catch (error) {
      setStatus({ error: true, message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function selectSeries(variable) {
    const existingData = data || {};
    setStatus({ message: "Loading selected series..." });
    try {
      const selectedSeries = await loadSeries(variable, existingData);
      applySearchResult({
        ...existingData,
        selectedSeries,
        variables: existingData.variables || []
      });
    } catch (error) {
      setStatus({ error: true, message: error.message });
    }
  }

  async function downloadSeries(variable) {
    setStatus({ message: "Loading series for Excel..." });
    try {
      const series = await loadSeries(variable, data || {});
      if (!series?.points?.length) throw new Error("No downloadable observations are available for this series.");
      downloadSeriesWorkbook(series);
      setStatus({ message: "Excel download started." });
    } catch (error) {
      setStatus({ error: true, message: error.message });
    }
  }

  async function loadSeries(variable, existingData) {
    const current = existingData.selectedSeries;
    if (sameSeries(current, variable)) return current;

    const key = seriesCacheKey(variable);
    const cached = seriesCache.current.get(key);
    if (cached) return await cached;

    const request = fetchJson(buildSeriesUrl(variable, existingData)).then(result => {
      if (!result.selectedSeries?.points?.length) throw new Error("No observations are available for this series.");
      seriesCache.current.set(key, result.selectedSeries);
      return result.selectedSeries;
    });
    seriesCache.current.set(key, request);

    try {
      return await request;
    } catch (error) {
      if (seriesCache.current.get(key) === request) seriesCache.current.delete(key);
      throw error;
    }
  }

  function applySearchResult(nextData) {
    if (nextData.needsCountry) {
      setData(null);
      setStatus({ error: true, message: nextData.userMessage || "Please include a country name." });
      return;
    }
    if (!nextData.selectedSeries?.points?.length) {
      setData(null);
      setStatus({ error: true, message: nextData.userMessage || "No matching EIA series was found." });
      return;
    }

    const interpreter = nextData.intent?.interpreter
      ? formatInterpreter(nextData.intent, nextData.query)
      : "Search complete.";
    seriesCache.current.set(seriesCacheKey(nextData.selectedSeries), nextData.selectedSeries);
    setData(nextData);
    setStatus({ message: `${interpreter} ${nextData.note || ""}`.trim() });
  }

  const series = data?.selectedSeries;
  const variables = data?.variables || [];

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-heading">
          <h1>EIA++ AI Assisted Data Extraction Tool</h1>
          {showLogout ? (
            <form className="logout-form" method="post" action="/api/logout">
              <button className="logout-button" type="submit">Logout</button>
            </form>
          ) : null}
        </div>

        <p className="ai-description">
          Unclear wording, typos, and grammatical errors are interpreted and corrected by AI. The request is then converted into structured search instructions used to retrieve the intended data from major data providers through direct API requests.
        </p>

        <div className="examples">
          <p><strong>Examples:</strong></p>
          <p className="example-item">"<span className="example-query">Brazil erngy production</span>" and "<span className="example-query">how much oil does Japan us</span>" are fine.</p>
          <p className="example-item">"<span className="example-query">Looking for data USA prdouction and consumption of nuclear energy</span>"<br />AI converts this into structure to retrieve the data.</p>
        </div>

        <SearchForm
          query={query}
          loading={loading}
          onQueryChange={setQuery}
          onSearch={searchEia}
        />
      </section>

      <SearchStatus status={status} />
      {series ? <RecentObservations series={series} /> : null}
      {series ? (
        <section className={`results-pair${variables.length ? "" : " single-result"}`}>
          <MatchingVariables variables={variables} onSelect={selectSeries} onDownload={downloadSeries} />
          <SelectedSeries series={series} source={data.source} />
        </section>
      ) : null}

      <section className="card about">
        <h2>About</h2>
        <ul className="muted">
          <li>The tool interprets unclear wording, corrects typos and grammar, and converts the request into structured search instructions.</li>
          <li>All data is retrieved directly from major data providers through API requests.</li>
          <li>In plain English, the app determines what the user is asking for, finds the matching data, and returns it in an organized format.</li>
        </ul>
      </section>
    </main>
  );
}

async function fetchJson(url) {
  const response = await fetch(url);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The backend returned a non-JSON response. Check the Vercel function logs.");
  }
  if (!response.ok || data.error) {
    throw new Error(data.userMessage || data.error || `Request failed with status ${response.status}.`);
  }
  return data;
}

function buildSeriesUrl(variable, existingData) {
  const params = new URLSearchParams({
    q: String(existingData.query || "brazil energy production"),
    country: String(variable.countryCode || existingData.country?.code || ""),
    productId: String(variable.productId || ""),
    activityId: String(variable.activityId || ""),
    unit: String(variable.unitFacet || "")
  });
  appendIntentParams(params, existingData.intent);
  return `/api/search-eia?${params}`;
}

function appendIntentParams(params, intent) {
  if (!intent) return params;
  params.set("intentReady", "1");
  params.set("intentCorrectedQuery", String(intent.correctedQuery || ""));
  params.set("intentInterpreter", String(intent.interpreter || "rules"));
  params.set("intentCountryCode", String(intent.countryCode || intent.country?.code || ""));
  params.set("intentProduct", String(intent.product || ""));
  params.set("intentActivity", String(intent.activity || ""));
  params.set("intentFrequency", String(intent.frequency || "annual"));
  return params;
}

function formatInterpreter(intent, fallbackQuery) {
  return `Interpreter: ${intent?.interpreter || "rules"}. Corrected query: ${intent?.correctedQuery || fallbackQuery}.`;
}

function seriesCacheKey(series) {
  return [series?.countryCode, series?.productId, series?.activityId, series?.unitFacet, series?.frequency || "annual"].join("|");
}

function sameSeries(series, variable) {
  return series &&
    series.countryCode === variable.countryCode &&
    series.productId === variable.productId &&
    series.activityId === variable.activityId &&
    series.unitFacet === variable.unitFacet;
}
