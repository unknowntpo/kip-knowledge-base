import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { KIPS } from "../lib/kips";

const mono = "var(--font-mono)";

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAsk = location.pathname.startsWith("/ask");
  const isBrowseList = location.pathname === "/";
  const query = searchParams.get("q") ?? "";

  const setQuery = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set("q", v);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const seg = (label: string, active: boolean, onClick: () => void) => (
    <div
      className="seg-item"
      onClick={onClick}
      style={{
        background: active ? "#f5f4f1" : "transparent",
        color: active ? "#16161a" : "#8f8c96",
      }}
    >
      {label}
    </div>
  );

  return (
    <header
      className="topbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        height: 60,
        padding: "0 24px",
        background: "#16161a",
        borderBottom: "1px solid #000",
        color: "#f5f4f1",
        flex: "0 0 auto",
      }}
    >
      {/* brand / home */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "#e35b3f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: mono,
            fontWeight: 600,
            fontSize: 15,
            color: "#16161a",
          }}
        >
          K
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
          KIP Knowledge Base
        </span>
        <span
          className="topbar-pill"
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: "#7f7c86",
            border: "1px solid #33333b",
            borderRadius: 5,
            padding: "2px 6px",
          }}
        >
          apache · kafka
        </span>
      </div>

      {/* segmented toggle */}
      <div
        style={{
          display: "flex",
          gap: 3,
          padding: 3,
          background: "#202027",
          border: "1px solid #33333b",
          borderRadius: 9,
        }}
      >
        {seg("Browse", !isAsk, () => navigate("/"))}
        {seg("✦ Ask AI", isAsk, () => navigate("/ask"))}
      </div>

      {/* search (browse list only) or spacer */}
      {isBrowseList ? (
        <div className="topbar-search" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 520 }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8f8c96",
                fontSize: 14,
              }}
            >
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search KIPs, motivations, trade-offs…"
              style={{
                width: "100%",
                height: 36,
                borderRadius: 8,
                border: "1px solid #33333b",
                background: "#202027",
                color: "#f5f4f1",
                fontSize: 13.5,
                padding: "0 12px 0 32px",
                outline: "none",
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* count */}
      <span className="topbar-count" style={{ fontFamily: mono, fontSize: 12, color: "#8f8c96", whiteSpace: "nowrap" }}>
        {KIPS.length} KIPs indexed
      </span>
    </header>
  );
}
