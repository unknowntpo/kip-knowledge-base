import { KIPS } from "../lib/kips";

const mono = "var(--font-mono)";

// Ask AI (semantic search) is intentionally deferred for now. This keeps the
// route + shell in place so it can be filled in later behind a single askKips() call.
export default function AskView() {
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 32px 90px" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: mono,
            fontSize: 11,
            color: "#3a53b0",
            background: "#eef1fb",
            border: "1px solid #d9defa",
            borderRadius: 20,
            padding: "4px 12px",
          }}
        >
          ✦ Semantic search · grounded in {KIPS.length} KIPs indexed
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: "18px 0 10px" }}>
          Ask the KIP knowledge base
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: "#5c584f" }}>
          Pose a natural-language question and get a grounded answer plus the most relevant KIPs, each
          with a “why relevant” explanation.
        </p>

        <div
          style={{
            marginTop: 22,
            background: "#fff",
            border: "1px dashed #d8d4cc",
            borderRadius: 14,
            padding: "22px 24px",
            color: "#716e67",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#33312c" }}>Coming soon.</strong> Semantic search is not wired up
          yet — we’re shipping browse &amp; the KIP detail pages first. The retrieval layer will slot
          in behind a single <code style={{ fontFamily: mono, fontSize: 13 }}>askKips(query)</code>{" "}
          call and expose the same <code style={{ fontFamily: mono, fontSize: 13 }}>search_kips</code>{" "}
          contract. For now, use{" "}
          <a href="#/" style={{ color: "#3a53b0" }}>Browse</a> with keyword search and tag filters.
        </div>
      </div>
    </div>
  );
}
