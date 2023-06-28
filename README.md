# argon2ian [![Support me on Patreon](https://img.shields.io/badge/dynamic/json?logo=patreon&color=%23e85b46&label=support%20me%20on%20patreon&query=data.attributes.patron_count&suffix=%20patrons&url=https%3A%2F%2Fwww.patreon.com%2Fapi%2Fcampaigns%2F9395291)](https://www.patreon.com/valpackett)

A *seriously size-optimized* WebAssembly build + conveniently async-ified TypeScript wrapper
for [Monocypher's implementation](https://monocypher.org/manual/argon2)
of the Argon2 password hash / KDF, the winner of the Password Hashing Competition.

| File                | Size in bytes |
| ------------------- | ------------- |
| Raw WASM            | 7145          |
| WASM gzipped        | 3129          |
| WASM gzipped base64 | 4172          |
| With sync wrapper   | 5839          |
| With async wrapper  | 6251          |

- No emscripten in the build! Built with raw clang using [wasi-libc](https://github.com/WebAssembly/wasi-libc) for basic headers / compiler-rt
- Using a simple arena allocator
- Both `key` (called `secret`) and `ad` options are exposed for advanced usage
- No `$argon2…` encoded strings support as of right now, as my primary use case is key derivation
  - TODO: implement in typescript using [this constant-time base64 impl](https://github.com/StableLib/stablelib/blob/master/packages/base64/base64.ts) I guess
- The `WebAssembly.Instance` is thrown away on every invocation to avoid occupying RAM when not working
  - Before that, secrets are wiped from that memory (not that they won't remain all over everywhere on the JS side lol)
- Native `DecompressionStream` used for decompressing the module ([caniuse](https://caniuse.com/mdn-api_compressionstream); WARN: arrived *very* recently in Firefox and Safari as of mid 2023)
- Async wrapper based on Web Workers but completely bundle-able / deno-cache-able, no separate worker files because everything is inlined!
- The sync version exposes the non-keyed blake2b hash function as well, because it's basically free (only added 20 bytes to encoded wasm)

Note: the 1.x version were based on the reference implementation and therefore support version 0x10 and perform a tiny bit better
(e.g. 393 → 372 ms/iter for argon2id with 256MiB) at the cost of extra ~2.2KiB size, not exposing blake2b, and not supporting the `p` (lanes) parameter
(that one was just my fault, not the reference implementation's).

## Usage

### Async (powered by Web Workers)

It's typically not a great idea to block the main thread, whether in a client-side app in a browser or in a server app.
Argon2ian provides an async API that hides all the messiness of Web Workers.

```typescript
import { ArgonWorker, variant } from 'https://deno.land/x/argon2ian/dist/argon2ian.async.min.js'; // bundled
// import { ArgonWorker, variant } from 'https://deno.land/x/argon2ian/src/async.ts'; // ← TypeScript/Deno

import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts'; // just for the demo here

const wrk = new ArgonWorker();
const enco = new TextEncoder();

const hash = await wrk.hash(enco.encode('password'), enco.encode('somesalt'),
  { t: 2, variant: variant.Argon2i }); // -> Uint8Array

const isCorrect = await wrk.verify(enco.encode('password'), enco.encode('somesalt'),
  decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
  { t: 2, variant: variant.Argon2i }); // -> boolean

console.log(hash, isCorrect);
wrk.terminate(); // e.g. once you're done with it in a browser,
// in a server just keep the worker running forever of course
```

### Blocking

In some scenarios like with many CLI apps there wouldn't be any benefit from the asynchornicity,
or if you're already doing your own Web Worker with your own logic, etc…

```typescript
import { hash, variant, verify } from 'https://deno.land/x/argon2ian/dist/argon2ian.sync.min.js'; // bundled
// import { hash, variant, verify } from 'https://deno.land/x/argon2ian/src/argon2.ts'; // ← TypeScript/Deno

import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts'; // just for the demo here

const enco = new TextEncoder();

const hsh = hash(enco.encode('password'), enco.encode('somesalt'),
  { t: 2, variant: variant.Argon2i }); // -> Uint8Array

const isCorrect = verify(enco.encode('password'), enco.encode('somesalt'),
  decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
  { t: 2, variant: variant.Argon2i }); // -> boolean

console.log(hsh, isCorrect);
```

## License

Like Monocypher, argon2ian is available under CC0 or 2-clause BSD.
