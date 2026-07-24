---
id: "KIP-2"
title: "Refactor brokers to allow listening on multiple ports and IPs"
status: "Unknown"
stub: true
cwiki:
  pageId: "50860018"
  version: 10
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=50860018"
  lastChecked: "2026-07-24T18:55:38Z"
threads:
  - url: "https://lists.apache.org/thread/v77rsyxllrdz9yvmmrl4kqpcy6yo1jlg"
    count: 1
  - url: "https://lists.apache.org/thread/h4yzp65xb5q0p9skgxmnpqk5517ygqjc"
    count: 9
tags: []
related: []
---

## Summary

The goal is to eventually support different security mechanisms on different ports. Currently brokers are defined as host+port pair, and this definition exists throughout the code-base, therefore some refactoring is needed to support multiple ports for a single broker.

The following wire protocol APIs will change. We are bumping the protocol version to support backward compatibility:UpdateMetadataRequest - will contain multiple host/port pairs, not just one. The new protocol is:

[ controllerId controllerEpoch partitionStateInfoCount partitionStateInfoCount [ Topic Partition controllerEpoch leader leaderEpoch isr.size [ isr ] zkVersion ] numAliveBrokers [ brokerId numEndpoints [ host port securityProtocol ] ] ] The bold part is new. it used to be [ brokerId host port ]. host => String port => Int32 securityProtocol => Int16 (corresponding to SecurityProtocol ENUM)

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=50860018)
