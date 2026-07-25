---
id: "KIP-41"
title: "Consumer Max Records"
status: "Adopted"
stub: true
cwiki:
  pageId: "61333789"
  version: 11
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61333789"
  lastChecked: "2026-07-25T00:41:30Z"
tags: []
related: []
---

## Summary

The KafkaConsumer API centers around the poll() API which is intended to be called in a loop. On every iteration of the loop, poll() returns a batch of records which are then processed inline. For example, a typical consumption loop might look like this:

records = consumer.poll(1000); records.forEach(record -> process(record)); consumer.commitSync(); }]]>In addition to fetching records, poll() is responsible for sending heartbeats to the coordinator and rebalancing when new members join the group and old members depart. The coordinator maintains a timer for every member in the group which is reset when a heartbeat is from that member is received. If no heartbeat is received before the expiration of a configurable session timeout, then the member is kicked out of the group and its partitions are reassigned to other members. If this happens while the consumer is processing a batch of records, there is no direct way for the consumer to stop processing and rejoin the group. Instead, the loop will finish processing the full batch and only find out afterwards that it has been kicked out of the group. This can lead to duplicate consumption since the partitions will already have been reassigned to another member in the group before offsets can be committed. In the worst case, if the processing time for record batches frequently approaches the session timeout, this can cause repeated rebalances and prevent the group from making progress.

Users can mitigate this problem by 1) increasing the session timeout, and 2) reducing the amount of data to process on each iteration of the loop. Increasing the session timeout is what we've recommended thus far, but it forces the user to accept the tradeoff of slower detection time for consumer failures. It's also worth noting that the time to rebalance depends crucially on the rate of heartbeats which is limited by the processing time in each iteration of the poll loop. If it takes one minute on average to process records, then it will also generally take one minute to complete rebalances. In some cases, when the processing time cannot be easily predicted, this option is not even viable without also adjusting the amount of data returned. For that, we give users a "max.partition.fetch.bytes" setting which limits the amount of data returned for each partition in every fetch. This is difficult to leverage in practice to limit processing time unless the user knows the maximum number of partitions they will consume from and can predict processing time according to the size of the data. In some cases, processing time does not even correlate directly with the size of the records returned, but instead with the count returned. It is also difficult to deal with the effect of increased load which can simultaneously increase the amount of data fetched and increase the amount of processing time.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61333789)
