---
id: "KIP-20"
title: "Enable log preallocate to improve consume performance under windows and some old Linux file system"
status: "Adopted"
stub: true
cwiki:
  pageId: "55155993"
  version: 10
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55155993"
  lastChecked: "2026-07-24T18:53:48Z"
tags: []
related: []
---

## Summary

Currently, when create on LogSegment, always create on empty file and keep APPEND data to it, for Linux file system (ext2/ext3/ext4 etc), it works fine. But for windows and some old unix/linux file system, after a while, there will be more and more fragments on hard disk, and affect consume performance a lot. So if we pre allocate file with one bigger value ( for example, 512MB) when create file, it will help us reduce fragments on hard disk and improve consume performance.

log.preallocate - Should pre allocate file when create new segment? Default value is false for backward compatible. If you are using Kafka on Windows, you probably need set it to true.

Configuration - add one configuration item "log.preallocate", parse it in KafkaConfig.scala, and transfer to KafkaServer.scala, LogConfig.scala.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55155993)
