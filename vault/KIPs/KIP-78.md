---
id: "KIP-78"
title: "Cluster Id"
status: "Adopted"
stub: true
cwiki:
  pageId: "65867685"
  version: 13
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65867685"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

GitHub PR: https://github.com/apache/kafka/pull/1830

It is increasingly common for organisations to have multiple Kafka clusters and there are a number of situations where it would be useful if the different clusters could be uniquely identified: monitoring, auditing, log aggregation, preventing clients and brokers from connecting to the wrong cluster and more. This KIP focuses on the monitoring and auditing use cases while ensuring that the design can be evolved to satisfy other use cases (this is covered in more detail in the "Potential Future Improvements" section).

One point worth covering is whether we already have something that could be used to uniquely identify a cluster. Today, each Kafka Cluster contains a set of brokers and an associated set of Zookeeper instances. You can identify each broker by a hostname or IP address (or a set of hostnames and IP addresses) and port (or ports), and can identify each Zookeeper instance by a hostname or IP address (or a set of hostnames and IP addresses) and port (or ports). Unfortunately, sets of hostnames, IP addresses, and ports are not a great way to uniquely identify a cluster as they might change over time. Brokers (and zookeeper instances) might die and be replaced with new instances on new machines, or might be moved to different machines. Clusters might be consolidated together, or hosts might be reused in new clusters.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65867685)
