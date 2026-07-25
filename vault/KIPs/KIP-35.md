---
id: "KIP-35"
title: "Retrieving protocol version"
status: "Adopted"
stub: true
cwiki:
  pageId: "61320744"
  version: 57
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61320744"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

This KIP aims to solve the problem that there is currently no way for a Kafka client to know which API version the broker supports. This means a client might not be able to perform its desired functionality, nor report any meaningful errors back to the application. This makes it hard for clients and applications to support multiple versions of Kafka, which in turn limits the Kafka eco-system since applications and clients will need to be manually built or configured for a specific broker version.

In order for a client to successfully talk to a broker, it needs to know what versions of various protocols does the broker support. The KIP suggests the following to achieve that.

A new ApiVersionRequest and Response type (version 0) will be added to allow clients to query the broker for supported API request types and versions.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61320744)
