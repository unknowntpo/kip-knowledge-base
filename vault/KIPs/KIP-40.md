---
id: "KIP-40"
title: "ListGroups and DescribeGroup"
status: "Adopted"
stub: true
cwiki:
  pageId: "61325633"
  version: 4
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61325633"
  lastChecked: "2026-07-25T00:41:27Z"
tags: []
related: []
---

## Summary

The capability to inspect consumer group metadata such as the list of members in the group and their partition assignments is crucial for debugging, monitoring, and administration, but there is currently no API which exposes this information for the new consumer. In the initial design of the group management protocol for the new consumer, it was assumed that group metadata would be persisted in Zookeeper by group coordinators. This would have allowed tooling to inspect Zookeeper directly to obtain this metadata in the same way that it does for the old consumer. However, the alternative of storing group metadata in Kafka was suggested in KAFKA-2017, which has several advantages, such as reducing overall load on Zookeeper and maintaining a clean separation of client state (stored in Kafka) from broker state (stored in Zookeeper). At the time of writing, no general agreement has been reached on this issue, so to avoid forcing a hasty decision, the consensus seems to be to revisit the question after the 0.9 release.

With this issue momentarily tabled, we still have the problem of how group metadata can be viewed on an active cluster. Inspecting broker logs to find current group membership and assignments is not really a viable solution, even in the short term. To address this problem, we propose to add two new requests: ListGroups and DescribeGroup. The purpose of the ListGroups API is to get a simple list of the groups that are managed by each broker. To get a list of all groups in the cluster, tools will have to query each broker separately and combine the results. The second API, DescribeGroup, is used to get detailed information about an individual group. This includes a list of the current members and their subscriptions/assignments. To use this API, tools will have to send on GroupMetadataRequest to locate the coordinator for the group, then use DescribeGroup to get the detailed information.

Below we show the proposed schemas for ListGroups and DescribeGroup. The ListGroups API takes no arguments and returns a simple list of the groups and their protocol types (e.g. "consumer" or "copycat"). The DescribeGroup API takes a single groupId and returns information on the current status of the group and its members. Below we describe these details in more detail.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61325633)
