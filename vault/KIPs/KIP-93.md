---
id: "KIP-93"
title: "Improve invalid timestamp handling in Kafka Streams"
status: "Adopted"
stub: true
cwiki:
  pageId: "66853188"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66853188"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently, Kafka Streams does not handle invalid (i.e., negative) timestamps returned from the TimestampExtractor gracefully, but fails with an exception, because negative timestamps cannot get handled in a meaningful way for any time based operators like window aggregates or joins.

Negative timestamp can occur for several reason.

You consume a topic that is written by old Kafka producer clients (i.e., version 0.9 or earlier), which don't use the new message format, and thus meta data timestamp field defaults to -1 if the topic is configured with log.message.timestamp.type=CreateTime

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66853188)
