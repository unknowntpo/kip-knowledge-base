import { STATUS_META } from "../lib/kips";
import type { Status } from "../types";

const mono = "var(--font-mono)";

export function StatusBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "md" | "lg" }) {
  const m = STATUS_META[status];
  const cfg =
    size === "lg"
      ? { fs: 11, pad: "3px 9px", radius: 6 }
      : size === "md"
        ? { fs: 11, pad: "3px 9px", radius: 6 }
        : { fs: 10.5, pad: "2px 7px", radius: 5 };
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: cfg.fs,
        fontWeight: 600,
        padding: cfg.pad,
        borderRadius: cfg.radius,
        background: m.bg,
        color: m.text,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export function TagPill({ tag }: { tag: string }) {
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: 10.5,
        color: "#6f6c76",
        background: "#f2f0ec",
        borderRadius: 5,
        padding: "2px 7px",
      }}
    >
      {tag}
    </span>
  );
}
