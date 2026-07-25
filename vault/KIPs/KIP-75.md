---
id: "KIP-75"
title: "Add per-connector Converters"
status: "Adopted"
stub: true
cwiki:
  pageId: "65865496"
  version: 2
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65865496"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Today, Kafka Connect uses a single set of Converters for the entire cluster (set in the WorkerConfig). This choice was motivated by the idea that usually a single cluster will be working with one format because most users will want to standardize on a single data format, e.g. keep all their data in Avro, JSON, etc., and if they use a single format, we can reduce configuration overhead by using an automatic default. However, inevitably users will end up with a need for a different format in a few cases, whether it be due to legacy data & systems, legacy connector systems, or simply ease of integration. Occasionally users may want to use Connect with a different data format, but today that requires running a separate process or cluster.

This KIP proposes to allow overriding Converters on a per-connector basis. Utilizing the default should still strongly be encouraged for the benefits listed above, but this provides an escape hatch to avoid having to run a whole new cluster for one connector with different requirements.

The key addition are two configuration options to ConnectorConfig (note that this is inherited by SourceConnectorConfig and SinkConnectorConfig, and while not public interface, the Connector configuration options are):

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65865496)
