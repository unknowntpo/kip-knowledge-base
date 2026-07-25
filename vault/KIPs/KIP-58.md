---
id: "KIP-58"
title: "Make Log Compaction Point Configurable"
status: "Adopted"
stub: true
cwiki:
  pageId: "62695984"
  version: 11
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62695984"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently Kafka's log compaction gives minimal control over what portion of the log remains uncompacted. There is a setting that prevents compaction until a certain dirty ratio has been reached but this does not provide any upper bound on how much of the log's head will remain uncompacted once it runs. Although the segment currently being written will never be compacted, this could leave as little as one message uncompacted.

As a result, it is impossible to be guaranteed that a consumer will get every update to a compacted topic. Even if the consumer falls behind by a single message it might get the compacted version.

One particularly relevant use case is database state replication through change data capture. This use case is specifically called out in the Kafka documentation for the compaction feature under "Database change subscription". It is convenient to produce this data in multiple topics (e.g. one per source table) and/or partitions. However, in order to be able to recreate a database state at a point of transactional consistency some coordination across topics/partions is required (e.g. a separate _checkpoint_ topic with the offsets at each transaction commit). If the table topics are all independently compacting there is currently no way to be assured that any given checkpoint can be materialized as the checkpointed offset for any given topic may have been compacted such that some keys may be taking on some subsequently inserted values. (Details: https://gist.github.com/ewasserman/f8c892c2e7a9cf26ee46)

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62695984)
