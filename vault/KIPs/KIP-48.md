---
id: "KIP-48"
title: "Delegation token support for Kafka"
status: "Adopted"
stub: true
cwiki:
  pageId: "61340085"
  version: 122
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61340085"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

We introduced support for security in kafka version 0.9.0. using kerberos as authentication layer. Kafka is designed to work with a lot of producers and consumers so in a secure environment all these clients will need access to a keytab or a TGT to ensure they can communicate with a secure kafka broker. This has few disadvantages:

Performance/load on KDC as each client has to go to KDC to get the ticket.

Renewal needs to go through KDC and this renewed TGT’s need to be redistributed to all the clients.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61340085)
