---
id: "KIP-57"
title: "Interoperable LZ4 Framing"
status: "Adopted"
stub: true
cwiki:
  pageId: "62694040"
  version: 11
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62694040"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Kafka's initial LZ4 compression implementation is not interoperable. It does not follow the standard LZ4 framing specification (see https://cyan4973.github.io/lz4/lz4_Frame_format.html). This makes it difficult for third-party clients to support LZ4 compression using off-the-shelf libraries. This KIP proposes to fix kafka's LZ4 handling so that it is conformant with the LZ4F specification and enable clients to interoperate with respect to LZ4-compressed messages.

Specifically, KAFKA-1493 attempted to implement the LZ4F interoperable framing specification. There's a bug, however, that causes the frame checksum to be incorrectly calculated. Fixing this single byte (refered to as HC) is the goal of this KIP.

None. Interface changes are for classes not currently marked as public in javadoc.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62694040)
