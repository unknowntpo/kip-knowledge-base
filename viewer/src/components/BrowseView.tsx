import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KIPS, filterKips } from "../lib/kips";
import type { Status } from "../types";
import FilterSidebar from "./FilterSidebar";
import KipCard from "./KipCard";

const mono = "var(--font-mono)";

export default function BrowseView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [status, setStatus] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const results = filterKips(query, status, tags);
  const filtering = Boolean(query || status || tags.length);

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

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <FilterSidebar
        status={status}
        tags={tags}
        onToggleStatus={toggleStatus}
        onToggleTag={toggleTag}
        onClearAll={clearAll}
      />
      <section style={{ flex: 1, overflowY: "auto", padding: "24px 32px 60px" }}>
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
            : `Browse ${KIPS.length} Kafka Improvement Proposals. Filter by status or topic, or search motivations and trade-offs.`}
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
              gridTemplateColumns: "repeat(auto-fill, minmax(430px, 1fr))",
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
