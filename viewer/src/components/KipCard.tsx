import type { Kip } from "../types";
import { StatusBadge, TagPill } from "./common";

const mono = "var(--font-mono)";

export default function KipCard({ kip, onOpen }: { kip: Kip; onOpen: () => void }) {
  return (
    <div className="kip-card" style={{ padding: "17px 18px 15px", gap: 10 }} onClick={onOpen}>
      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
          {kip.id}
        </span>
        <StatusBadge status={kip.status} />
        <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: "#a7a39a" }}>
          {kip.release}
        </span>
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: 15.5,
          fontWeight: 600,
          lineHeight: 1.32,
          letterSpacing: "-0.01em",
          color: "#24221d",
        }}
      >
        {kip.title}
      </h3>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#565349" }}>{kip.summary}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {kip.tags.map((t) => (
          <TagPill key={t} tag={t} />
        ))}
      </div>
    </div>
  );
}
