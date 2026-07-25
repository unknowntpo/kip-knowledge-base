---
id: "KIP-59"
title: "Proposal for a kafka broker command"
status: "Under Discussion"
stub: true
cwiki:
  pageId: "62695998"
  version: 7
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62695998"
  lastChecked: "2026-07-25T00:42:06Z"
tags: []
related: []
---

## Summary

This page is meant as a template for writing a . To create a KIP choose Tools->Copy on this page and modify with your content and replace the heading with the next KIP number and a description of your issue. Replace anything in italics with your own description.

This is a proposal for an admin tool - say, kafka-brokers.sh to provide broker related useful information. Some of the key factors for Kafka's success are its performant architecture and operational simplicity. This is further complemented with a set of commandline tools and utilities for managing topics as well as testing/stress-testing. However currently Kafka lacks commands/tools to get cluster and broker overview. Although it should be mentioned that Kafka does expose cluster information via API and broker metrics via JMX.

The kafka-broker.sh command is modeled after the kafka-topic.sh and has options as described later below.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62695998)
