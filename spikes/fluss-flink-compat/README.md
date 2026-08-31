# Fluss/Flink compatibility spike

This isolated Maven module proves the pinned Fluss connector can be discovered
by the pinned Flink Table API on a Java 17 bytecode baseline. It does not start
a Fluss cluster and is not evidence of event replay or Feed parity.

Run the classpath smoke test:

```bash
mvn -B verify -f spikes/fluss-flink-compat/pom.xml
```

After a Flink job emits an `osskb.reference-projection.v1` candidate, run the
separate semantic gate:

```bash
bun run --cwd packages/reference-pipeline parity:verify -- /path/to/candidate.json
```

The candidate must be independently produced. Passing the recorded oracle back
to the command only tests the gate itself and is not parity evidence.
