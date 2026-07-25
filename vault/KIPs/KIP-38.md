---
id: "KIP-38"
title: "ZooKeeper Authentication"
status: "Adopted"
stub: true
cwiki:
  pageId: "61324523"
  version: 15
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61324523"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

As part of the effort to introduce and strengthen the security features of Kafka, we propose a set of changes to authenticate access to the metadata stored in ZooKeeper. Currently, the metadata stored in ZooKeeper for any given Kafka cluster is open and can be manipulated by any client with access to the ZooKeeper ensemble. The goal of this KIP is to restrict access to authenticated clients by leveraging the SASL authentication feature available in the 3.4 branch of ZooKeeper. With this feature, clients authenticate upon connecting to a ZooKeeper server with security configured and enabled. Once authenticated, the ensemble uses the client credentials to authorize access to znodes that have ACLs configured to restrict access.

The current ACL used with all znodes is open for read and write access, and with this KIP we want to make it unrestricted for authenticated clients, but readable by any client. We assume that no data stored in ZooKeeper is sensitive and can be read by anyone with the ability of connecting to the ensemble, but the metadata stored in it can be used to mount specific attacks against the cluster. For example, the metadata of a broker can be manipulated or a rogue broker can be introduced and start participating in replica sets as any other broker. Note that the feature described here focuses on brokers and does not include the old consumer, since it is becoming deprecated.

This proposal assumes that all changes to APIs are internal and there are visible changes to users only through configuration parameters. Users need to setup a JAAS login configuration file and specify it as a system property named java.security.auth.login.config. With this property set, Kafka brokers turn security features on and use more strict ACLs rather than the open unsafe one. Specifically, it uses CREATOR_ALL_ACL and READ_ACL_UNSAFE when the security feature is on, which enable the creator (or anyone with the credentials of the creator) to manipulate the znode while everyone else can read it. That's the only bit that changes to users, everything else happens under the hood.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61324523)
