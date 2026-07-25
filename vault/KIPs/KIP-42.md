---
id: "KIP-42"
title: "Add Producer and Consumer Interceptors"
status: "Adopted"
stub: true
cwiki:
  pageId: "61337088"
  version: 21
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61337088"
  lastChecked: "2026-07-25T00:41:32Z"
tags: []
related: []
---

## Summary

Today, Kafka metrics are only collected for individual clients or brokers. This makes it difficult for users to trace the path of individual messages across the cluster, providing a complete end-to-end picture of system performance and behavior. Technically, it is possible to measure end-to-end performance today by modifying users applications to collect and track additional information, but that isn't always practical for critical infrastructure applications. The ability to quickly deploy tools to observe, measure, and monitor Kafka client behavior, down to the message level, is valuable in production environments. At the same time, metrics might need contextual metadata that may vary across applications. The ability to measure and monitor clients without writing new code or recompiling applications is essential. (In some cases, it might help to connect to running applications.)

To enable this functionality, we would like to add producer and consumer interceptors that can intercept messages at different points on producer and consumer. The mechanism that we are proposing is inspired by the interceptor interface in Apache Flume. While there are potentially many ways to use an interceptor interface (for example, detecting anomalies, encrypting data, filtering fields), each of them would require a careful evaluation of whether or not it should be done with interceptor or with another mechanism. It is better to add the related APIs when there is a clear motivation for those use cases. Thus, we are proposing minimal producer and consumer interceptor interfaces that are designed to support only measurement and monitoring.

While it is possible to add more metrics or improve monitoring in Kafka, we believe that creating a flexible, customizable interface is beneficial for the following reasons:

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61337088)
