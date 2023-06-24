# argon2ian [![Support me on Patreon](https://img.shields.io/badge/dynamic/json?logo=patreon&color=%23e85b46&label=supporters&query=data.attributes.patron_count&suffix=%20patrons&url=https%3A%2F%2Fwww.patreon.com%2Fapi%2Fcampaigns%2F9395291)]()

A *seriously size-optimized* WebAssembly build + conveniently async-ified TypeScript wrapper
for the [reference implementation](https://github.com/P-H-C/phc-winner-argon2)
of the Argon2 password hash / KDF, the winner of the Password Hashing Competition.

| File                | Size in bytes |
| ------------------- | ------------- |
| Raw WASM            | 12727         |
| WASM gzipped        | 4776          |
| WASM gzipped base64 | 6368          |
| With sync wrapper   | 7836          |
| With async wrapper  | 8475          |

- No emscripten in the build! Built with raw clang using [wasi-libc](https://github.com/WebAssembly/wasi-libc) for basic headers
  - this does mean no SIMD though; autovectorization seems to only make it slower and we can't compile the SSE version like emscripten can
  - when [SIMDe](https://github.com/simd-everywhere/simde/issues/86) implements all the intrinsics used, that would change though…
- Using a simple arena allocator, as actual malloc is completely pointless here
- Both `secret` and `ad` options are exposed for advanced usage
- Not including the `$argon2…` encoded strings support as of right now, as my primary use case is key derivation
  - TODO: implement in typescript using [this constant-time base64 impl](https://github.com/StableLib/stablelib/blob/master/packages/base64/base64.ts) I guess
- The `WebAssembly.Instance` is thrown away on every invocation to avoid occupying RAM when not working
- Native `DecompressionStream` used for decompressing the module ([caniuse](https://caniuse.com/mdn-api_compressionstream); WARN: arrived *very* recently in Firefox and Safari as of mid 2023)
- Async wrapper based on Web Workers but completely bundle-able / deno-cache-able, no separate worker files because everything is inlined!

## Usage

### Async (powered by Web Workers)

It's typically not a great idea to block the main thread, whether in a client-side app in a browser or in a server app.
Argon2ian provides an async API that hides all the messiness of Web Workers.

```typescript
import { ArgonWorker, variant, version } from 'https://deno.land/x/argon2ian/dist/argon2ian.async.min.js'; // bundled
// import { ArgonWorker, variant, version } from 'https://deno.land/x/argon2ian/src/async.ts'; // ← TypeScript/Deno

import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts'; // just for the demo here

const wrk = new ArgonWorker();
const enco = new TextEncoder();

const hash = await wrk.hash(enco.encode('password'), enco.encode('somesalt'),
  { t: 2, variant: variant.Argon2i, version: version.V0x10 }); // -> Uint8Array

const isCorrect = await wrk.verify(enco.encode('password'), enco.encode('somesalt'),
  decode(enco.encode('f6c4db4a54e2a370627aff3db6176b94a2a209a62c8e36152711802f7b30c694')),
  { t: 2, variant: variant.Argon2i, version: version.V0x10 }); // -> boolean

console.log(hash, isCorrect);
wrk.terminate(); // e.g. once you're done with it in a browser,
// in a server just keep the worker running forever of course
```

### Blocking

In some scenarios like with many CLI apps there wouldn't be any benefit from the asynchornicity,
or if you're already doing your own Web Worker with your own logic, etc…

```typescript
import { hash, variant, verify, version } from 'https://deno.land/x/argon2ian/dist/argon2ian.sync.min.js'; // bundled
// import { hash, variant, verify, version } from 'https://deno.land/x/argon2ian/src/argon2.ts'; // ← TypeScript/Deno

import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts'; // just for the demo here

const enco = new TextEncoder();

const hsh = hash(enco.encode('password'), enco.encode('somesalt'),
  { t: 2, variant: variant.Argon2i, version: version.V0x10 }); // -> Uint8Array

const isCorrect = verify(enco.encode('password'), enco.encode('somesalt'),
  decode(enco.encode('f6c4db4a54e2a370627aff3db6176b94a2a209a62c8e36152711802f7b30c694')),
  { t: 2, variant: variant.Argon2i, version: version.V0x10 }); // -> boolean

console.log(hsh, isCorrect);
```

## License

Like the C reference implementation it uses, argon2ian is available under CC0 or Apache 2.0.
