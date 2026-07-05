import { ALL_TAGS, STATUSES, STATUS_META, statusCount, tagCount } from "../lib/kips";
import type { Status } from "../types";

const mono = "var(--font-mono)";

const sectionLabel: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 10.5,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "#9a968d",
  marginBottom: 11,
};

export default function FilterSidebar({
  status,
  tags,
  onToggleStatus,
  onToggleTag,
  onClearAll,
}: {
  status: string | null;
  tags: string[];
  onToggleStatus: (s: Status) => void;
  onToggleTag: (t: string) => void;
  onClearAll: () => void;
}) {
  return (
    <aside
      style={{
        flex: "0 0 258px",
        background: "var(--surface-alt)",
        borderRight: "1px solid var(--border-1)",
        padding: "22px 20px 40px",
        overflowY: "auto",
      }}
    >
      <div style={sectionLabel}>Status</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 26 }}>
        {STATUSES.map((s) => {
          const active = status === s;
          const m = STATUS_META[s];
          return (
            <div
              key={s}
              className="status-row"
              onClick={() => onToggleStatus(s)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 10px",
                fontSize: 13.5,
                background: active ? m.bg : "transparent",
                color: active ? m.text : "#43413a",
                fontWeight: active ? 600 : 400,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot }}
                />
                {s}
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, opacity: active ? 1 : 0.7 }}>
                {statusCount(s)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={sectionLabel}>Topics &amp; Tags</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ALL_TAGS.map((t) => {
          const active = tags.includes(t);
          return (
            <span
              key={t}
              className={"tag-chip" + (active ? " active" : "")}
              onClick={() => onToggleTag(t)}
            >
              {t} <span style={{ opacity: 0.55 }}>{tagCount(t)}</span>
            </span>
          );
        })}
      </div>

      <div
        className="link-underline"
        onClick={onClearAll}
        style={{ marginTop: 22, fontSize: 12.5, color: "#8a877f" }}
      >
        Clear all filters
      </div>
    </aside>
  );
}
