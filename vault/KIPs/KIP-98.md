---
id: "KIP-98"
title: "Exactly Once Delivery and Transactional Messaging"
status: "Adopted"
category: "Delivery Semantics"
release: "0.11.0"
authors:
  - "Apurva Mehta"
  - "Jason Gustafson"
  - "Guozhang Wang"
  - "Flavio Junqueira"
tags:
  - "Delivery Semantics"
  - "Transactions"
  - "Idempotence"
  - "Producer"
related:
  - "[[KIP-679]]"
  - "[[KIP-848]]"
---

## Summary

Introduces idempotent producers and multi-partition atomic writes, giving Kafka exactly-once semantics for produce and read-process-write pipelines.

## Motivation

The default producer offered at-least-once delivery: a retried send after a network hiccup could produce duplicates, forcing every downstream consumer to dedupe.

Stream-processing apps read, transform, and write back to Kafka. Without atomic writes across output partitions plus offset commits, a crash mid-flight leaves partial, inconsistent results.

## Proposed Changes / Design

Idempotence: each producer gets a Producer ID and per-partition sequence numbers, so the broker can detect and drop duplicate retries within a session.

Transactions: a producer wraps writes to multiple partitions — and its consumer offset commits — in a transaction coordinated by a transaction log. Consumers with read_committed only see records once the transaction commits.

## Trade-offs

> [!success]+ Benefits
> - True exactly-once for read-process-write topologies.
> - Idempotence removes duplicates from producer retries with minimal overhead.
> - Enables correct, atomic Kafka Streams state and output.

> [!warning]+ Costs / Risks
> - Transactions add coordinator state and two-phase commit latency.
> - read_committed consumers may wait on the Last Stable Offset.
> - More client and broker complexity to reason about and operate.

## Rejected Alternatives

**Consumer-side dedup only** — Pushing dedup to every consumer duplicates effort, is error-prone, and can't make multi-partition writes atomic.

**Per-message unique keys** — Application-level dedup keys don't cover offset commits and cross-partition atomicity, so they can't deliver end-to-end exactly-once.

## Discussion Thread

*dev@kafka.apache.org · Nov 2016 – Feb 2017, 150+ messages*

**Apurva Mehta** · *Dec 2016*
> This KIP covers idempotent produce and transactions. Idempotence ships first and is cheap; transactions build on the same Producer ID machinery.

**Jason Gustafson** · *Dec 2016*
> The Last Stable Offset is key: read_committed consumers must not see records past an open transaction, or we break isolation.

**Jay Kreps** · *Jan 2017*
> Big +1. This is foundational for stream processing correctness. Worth being very careful about the default configs so most users get idempotence without surprises.

## Voting Thread

*Vote closed Feb 2017*

**Result:** Accepted · +4 binding, +3 non-binding, 0 -1

- **+1** Jay Kreps — binding
- **+1** Jun Rao — binding
- **+1** Guozhang Wang — binding
- **+1** Neha Narkhede — binding
