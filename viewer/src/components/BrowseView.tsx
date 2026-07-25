import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useKipIndex } from "../lib/kips";
import type { Status } from "../types";
import FilterSidebar from "./FilterSidebar";
import KipCard from "./KipCard";

const mono = "var(--font-mono)";

export default function BrowseView() {
  const navigate = useNavigate();
  const { index, error } = useKipIndex();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [status, setStatus] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Search matches id + title + blurb + tags + category. Full summary/motivation
  // text lives in the per-KIP detail payloads and is deliberately not fetched
  // here (see src/lib/kips.ts) — deep search is the Ask AI/semantic path's job.
  const results = useMemo(
    () => index?.filter(query, status, tags) ?? [],
    [index, query, status, tags]
  );
  const filtering = Boolean(query || status || tags.length);
  const activeFilterCount = (query ? 1 : 0) + (status ? 1 : 0) + tags.length;

  const setQuery = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set("q", v);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const clearAll = () => {
    setStatus(null);
    setTags([]);
    setQuery("");
  };

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleStatus = (s: Status) => setStatus((cur) => (cur === s ? null : s));

  // The index is one fetch of static JSON off the CDN; show a quiet placeholder
  // rather than an empty shell while it lands.
  if (!index) {
    return (
      <div style={{ padding: "70px 32px", textAlign: "center", fontSize: 14, color: "#9a968d" }}>
        {error ? `Could not load the KIP index: ${error}` : "Loading KIPs…"}
      </div>
    );
  }

  return (
    <div className="browse-root" style={{ display: "flex", height: "100%" }}>
      <button
        className="filters-toggle"
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
      >
        {showFilters ? "Hide filters" : "Filters"}
        {activeFilterCount > 0 && <span className="filters-badge">{activeFilterCount}</span>}
      </button>
      <FilterSidebar
        index={index}
        open={showFilters}
        status={status}
        tags={tags}
        onToggleStatus={toggleStatus}
        onToggleTag={toggleTag}
        onClearAll={clearAll}
      />
      <section className="browse-results" style={{ flex: 1, overflowY: "auto", padding: "24px 32px 60px" }}>
        <div
          style={{
            maxWidth: 940,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {filtering ? "Filtered results" : "All KIPs"}
          </h1>
          <span style={{ fontFamily: mono, fontSize: 12, color: "#9a968d" }}>
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
        </div>
        <p style={{ maxWidth: 660, fontSize: 13.5, color: "#716e67", marginTop: 8 }}>
          {filtering
            ? "Matching KIPs for your current search and filters. Adjust the status, tags, or keyword to refine."
            : `Browse ${index.kips.length} Kafka Improvement Proposals. Filter by status or topic, or search titles and summaries.`}
        </p>

        {results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0", fontSize: 14, color: "#9a968d" }}>
            No KIPs match these filters.{" "}
            <span className="link-underline" style={{ color: "#3a53b0" }} onClick={clearAll}>
              Clear filters
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(430px, 100%), 1fr))",
              gap: 14,
              maxWidth: 940,
              marginTop: 20,
            }}
          >
            {results.map((k) => (
              <KipCard key={k.id} kip={k} onOpen={() => navigate(`/kip/${k.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
