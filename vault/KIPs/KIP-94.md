---
id: "KIP-94"
title: "Session Windows"
status: "Adopted"
stub: true
cwiki:
  pageId: "66853499"
  version: 25
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66853499"
  lastChecked: "2026-07-25T00:43:23Z"
tags: []
related: []
---

## Summary

Many stream processing applications need to maintain state across a period of time. Online services, for example, like to understand the behaviour of a typical user. In order to understand this behaviour, the interactions a user has with their website, or streaming service, are grouped together into sessions.

Sessions usually represent some period of user activity separated by a defined gap of inactivity. As events are processed they may create new sessions or be merged into existing sessions. Any sessions that are merged will usually extend the time window the session covers. Thus, session windows are dynamic in nature, i.e, they don’t fit into fixed and aligned time windows, but rather are varying-sized time windows that can't be pre-computed and are driven by timestamps of the data.

We will provide a way for developers using the DSL to specify that they want an aggregation to be aggregated into SessionWindows. Three overloaded methods will be added to KGroupedStream:

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66853499)
