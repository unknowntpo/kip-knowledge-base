---
id: "KIP-55"
title: "Secure Quotas for Authenticated Users"
status: "Adopted"
stub: true
cwiki:
  pageId: "62693031"
  version: 43
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62693031"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

KIP-13 introduced client quotas in Kafka 0.9.0.0. Rate limits on producers and consumers are enforced to prevent clients saturating the network or monopolizing broker resources. The current implementation allocates quotas to client-ids. This works well in single user clusters or clusters that use PLAINTEXT where all users have the same identity. But since client-id is unauthenticated and can be set to any value by the client, multi-tenant secure installations require secure quotas to be enforced to guarantee fair allocation of resources and prevent denial-of-service.

With the introduction of security in Kafka 0.9, the identity of Kafka clients is the user principal. User principal is an authenticated user or a grouping of unauthenticated users chosen by the broker using a configurable PrincipalBuilder and is currently used for ACLs. Client-id is a logical grouping of clients with a meaningful name that is used in client metrics and logs. Multi-user systems have a hierarchy - user owns zero or more clients. <user-principal, client-id> defines a safe group of clients. The shorter unsafe client-id is sufficient in client metrics and logs, but quotas should be allocated to safe groups to avoid clients of one user throttling clients of another user with the same client-id.

This KIP proposes the following changes to the existing implementation:

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62693031)
