---
id: "KIP-71"
title: "Enable log compaction and deletion to co-exist"
status: "Adopted"
stub: true
cwiki:
  pageId: "65864170"
  version: 17
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864170"
  lastChecked: "2026-07-25T00:42:26Z"
tags: []
related: []
---

## Summary

For some usages, i.e., join windows in Kafka Streams, it is desirable to have logs that are both compacted and deleted. In these types of applications you may have windows of time with many versions of key, during the window you only want to retain the latest version of the key, however once the window has expired you would like to have the segments for the window deleted. With both compact and delete enabled retention.ms of the changelog would be set to a value greater than the retention of the window. Although old windows wont automatically be removed on expiration they will eventually be removed by the broker as the old segments expire. Kafka doesn’t currently support these semantics as compaction and deletion are exclusive.

Enabling this will also be useful in other scenarios, i.e., any ingest of data where you only care about the latest value for a particular key, but disk constraints mean you can't keep the entire keyset.

Modify cleanup.policy to take a comma separated list of valid policies, i.e., cleanup.policy=compact,delete

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864170)
