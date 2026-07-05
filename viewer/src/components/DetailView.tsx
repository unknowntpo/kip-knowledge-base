import { Link, useNavigate, useParams } from "react-router-dom";
import { avatarColor, getKip, initials } from "../lib/kips";
import { StatusBadge, TagPill } from "./common";

const mono = "var(--font-mono)";

const heading: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#3a53b0",
  marginBottom: 11,
};
const section: React.CSSProperties = { marginBottom: 30 };

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: 10.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "#9a968d",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

export default function DetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const kip = getKip(id);

  if (!kip) {
    return (
      <div style={{ height: "100%", overflowY: "auto", padding: "60px 32px" }}>
        <p style={{ color: "#716e67" }}>
          KIP not found. <Link to="/" style={{ color: "#3a53b0" }}>Back to all KIPs</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--page-bg)" }}>
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "26px 32px 90px",
          display: "grid",
          gridTemplateColumns: "1fr 268px",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* main column */}
        <main>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              fontSize: 13,
              color: "#6f6c76",
              textDecoration: "none",
              marginBottom: 18,
            }}
          >
            ← Back to all KIPs
          </Link>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: "#3a53b0" }}>
              {kip.id}
            </span>
            <StatusBadge status={kip.status} size="lg" />
          </div>

          <h1
            style={{
              margin: "0 0 14px",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "#1c1b19",
            }}
          >
            {kip.title}
          </h1>

          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 17,
              lineHeight: 1.55,
              color: "#43413a",
              marginBottom: 30,
            }}
          >
            {kip.summary}
          </p>

          <div style={section}>
            <div style={heading}>Motivation</div>
            {kip.motivation.map((p, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.62, color: "#33312c", margin: "0 0 11px" }}>
                {p}
              </p>
            ))}
          </div>

          <div style={section}>
            <div style={heading}>Proposed Changes / Design</div>
            {kip.design.map((p, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.62, color: "#33312c", margin: "0 0 11px" }}>
                {p}
              </p>
            ))}
          </div>

          <div style={section}>
            <div style={heading}>Trade-offs</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div
                style={{
                  background: "#eef6f0",
                  border: "1px solid #cfe6d8",
                  borderRadius: 11,
                  padding: "15px 16px",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "#1f7a4d", marginBottom: 10 }}>
                  ＋ Benefits
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  {kip.pros.map((p, i) => (
                    <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: "#2a4536" }}>{p}</li>
                  ))}
                </ul>
              </div>
              <div
                style={{
                  background: "#f7efe9",
                  border: "1px solid #e8d4c6",
                  borderRadius: 11,
                  padding: "15px 16px",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "#a3542a", marginBottom: 10 }}>
                  － Costs / Risks
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  {kip.cons.map((c, i) => (
                    <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: "#52392a" }}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={heading}>Rejected Alternatives</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kip.rejected.map((r, i) => (
                <div key={i} style={{ borderLeft: "3px solid #d8d4cc", paddingLeft: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#33312c" }}>{r.name}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#6b6860" }}>{r.why}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={section}>
            <div style={heading}>Discussion Thread</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: "#9a968d", marginBottom: 6 }}>
              dev@kafka.apache.org · {kip.discussionMeta}
            </div>
            {kip.discussion.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 13,
                  padding: "13px 0",
                  borderBottom: "1px solid #e6e2db",
                }}
              >
                <div
                  style={{
                    flex: "0 0 34px",
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: avatarColor(d.author),
                    color: "#fff",
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {initials(d.author)}
                </div>
                <div>
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#24221d" }}>{d.author}</span>{" "}
                    <span style={{ fontFamily: mono, fontSize: 10.5, color: "#a7a39a" }}>{d.date}</span>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#4a473f" }}>{d.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={section}>
            <div style={heading}>Voting Thread</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: "#9a968d", marginBottom: 8 }}>
              {kip.vote.closed}
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e6e2db",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#f3f6f2",
                  borderBottom: "1px solid #e6e2db",
                  padding: "14px 18px",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "#1f7a4d" }}>
                  ✓ {kip.vote.result}
                </span>
                <span style={{ fontFamily: mono, fontSize: 12.5, color: "#4a473f" }}>{kip.vote.tally}</span>
              </div>
              <div style={{ padding: "4px 18px 8px" }}>
                {kip.vote.votes.map((v, i) => {
                  const positive = v.vote.trim().startsWith("+");
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "9px 0",
                        borderBottom: "1px solid #f0eee9",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 13,
                          fontWeight: 600,
                          width: 30,
                          color: positive ? "#1f7a4d" : "#a3402c",
                        }}
                      >
                        {v.vote}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: "#24221d" }}>{v.name}</span>
                      <span style={{ fontFamily: mono, fontSize: 10.5, color: "#9a968d" }}>{v.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* right rail */}
        <aside
          style={{
            position: "sticky",
            top: 26,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div style={{ background: "#fff", border: "1px solid #e6e2db", borderRadius: 12, padding: "16px 17px" }}>
            <RailLabel>Metadata</RailLabel>
            <Field label="Authors" value={kip.authors} />
            <Field label="Category" value={kip.category} />
            <Field label="Released in" value={kip.release} mono />
            <div style={{ fontSize: 11, color: "#9a968d", marginBottom: 6 }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {kip.tags.map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </div>
          </div>

          {kip.related.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e6e2db", borderRadius: 12, padding: "16px 17px" }}>
              <RailLabel>Related KIPs</RailLabel>
              {kip.related.map((rid) => {
                const r = getKip(rid);
                return (
                  <div
                    key={rid}
                    className="related-item"
                    onClick={() => navigate(`/kip/${rid}`)}
                  >
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "#3a53b0" }}>{rid}</span>
                    {r && <span style={{ fontSize: 12.5, color: "#4a473f" }}> {r.title}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, mono: isMono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#9a968d", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#33312c", fontFamily: isMono ? mono : undefined }}>{value}</div>
    </div>
  );
}
