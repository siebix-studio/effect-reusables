import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.log("Hello, world!");
});

BunRuntime.runMain(program);
