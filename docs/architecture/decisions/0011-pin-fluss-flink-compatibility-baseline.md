# ADR-0011: Pin the first Fluss/Flink compatibility baseline

- Status: Accepted for compatibility spike
- Date: 2026-09-01

## Context

ADR-0001 and ADR-0002 select Fluss and Flink, while ADR-0006 makes the
TypeScript reference materializer the parity oracle. The first executable
spike now needs one reproducible dependency set before a cluster-backed
vertical slice is implemented.

Apache Fluss 0.9.1 is the current 0.9 patch release. Its official Flink guide
publishes connectors for Flink 1.18, 1.19, 1.20, and 2.2, but the same guide's
support table and quick-start procedure explicitly cover the 1.x line and use
Flink 1.20.3. The Fluss 0.9.1 source also contains a Flink 2.2 connector module,
but this documentation mismatch is not a sound first baseline.

## Decision

- Pin Fluss `0.9.1-incubating`.
- Pin Flink `1.20.3` and artifact `fluss-flink-1.20`.
- Compile the spike to Java 17 bytecode and run it on Java 17 or newer.
- Keep the compatibility harness isolated under `spikes/fluss-flink-compat`.
- Require Flink to discover Fluss's `fluss` catalog factory through the real
  pinned artifacts in CI.
- Keep semantic parity separate: an independently produced Flink candidate
  must match the canonical Spec 004 projection and digest.
- Do not treat connector discovery as cluster, replay, restart, or parity
  evidence and do not use this spike to publish serving data.

## Alternatives considered

### Flink 2.2

Deferred. Fluss 0.9.1 ships a `fluss-flink-2.2` artifact and announces Flink
2.2 integration, but its support table and quick-start path are inconsistent.
It remains a deliberate follow-up matrix candidate after the 1.20.3 baseline
passes a cluster-backed run.

### Flink 1.18 or 1.19

Rejected for the first baseline. They are supported but older than the
documented 1.20.3 quick-start without reducing a demonstrated project risk.

### Java 21 bytecode

Rejected. The developer machine may run a newer JDK, but Java 17 is the more
portable baseline and is strongly recommended by Fluss for local deployment.

## Consequences

- Dependency drift becomes visible in one small, fast CI job.
- The next slice can focus on a Fluss Log Table, Flink materialization, and a
  Primary Key Table rather than classpath discovery.
- Flink 2.2 adoption remains evidence-driven rather than implied by artifact
  availability.

## Revisit when

- the Flink 1.20 line no longer receives required fixes;
- Fluss documents one unambiguous Flink 2.2+ support and quick-start path;
- a cluster-backed matrix run proves another version with the same fixture;
- production runtime constraints require a different Java baseline.

## Primary references

- https://fluss.apache.org/docs/engine-flink/getting-started/
- https://fluss.apache.org/docs/install-deploy/deploying-local-cluster/
- https://github.com/apache/fluss/releases/tag/v0.9.1-incubating
- https://github.com/apache/fluss/blob/v0.9.1-incubating/fluss-flink/fluss-flink-2.2/pom.xml
