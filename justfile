#!/usr/bin/env -S just --justfile

LLVM := "/usr/local/llvm16/bin"
OPT := "wasm-opt"
ZOPFLI := "zopfli"
OPENSSL := "openssl"
SYSROOT := "/usr/local/share/wasi-sysroot"

# NOTE: literally removing wasm-opt from clang's PATH because ughwtf https://stackoverflow.com/q/75392581

# NOTE: there is comically little perf to be gained by unrolling and -O3, like about 10ms/iter
# and -msimd128 autovectorization makes it a little bit worse even (or a lot worse without -O3)
# so what I thought would be "the code golf edition" is actually the one and only edition :D

# NOTE: crypto_blake2b_keyed adds 288 extra bytes (in argon2.blob.js) while crypto_blake2b only 20 (!)

mkwasm:
	PATH="{{LLVM}}" clang -Oz -flto=full -std=c11 --target=wasm32-wasi "--sysroot={{SYSROOT}}" -nostartfiles \
		-Wl,--no-entry \
		-Wl,--export=a -Wl,--export=b -Wl,--export=t -Wl,--export=s -Wl,--export=w -Wl,--export=m \
		-Dcrypto_blake2b=b -Dcrypto_verify32=t -Dcrypto_verify64=s -Dcrypto_wipe=w \
		-DBLAKE2_NO_UNROLLING \
		-Imonocypher/src monocypher/src/monocypher.c arena.c args.c \
		-o argon2.unopt.wasm
	"{{OPT}}" -Oz -cw -lmu -tnh -uim -ifwl --enable-simd -o dist/argon2.wasm argon2.unopt.wasm
	echo -n 'export default "' > src/gen/argon2.blob.js
	"{{ZOPFLI}}" -i69 -c dist/argon2.wasm | "{{OPENSSL}}" enc -base64 -A >> src/gen/argon2.blob.js
	echo -n '"' >> src/gen/argon2.blob.js
	"{{ZOPFLI}}" -i69 -c dist/argon2.wasm | "{{OPENSSL}}" enc -base64 -A > test.opt.wasm.gz.b64
	"{{ZOPFLI}}" -i69 -c dist/argon2.wasm > test.opt.wasm.gz
	rm argon2.unopt.wasm

mkjs:
	#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write=dist,src/gen --allow-net=deno.land
	import { bundle } from 'https://deno.land/x/emit@0.24.0/mod.ts';
	import { minify } from 'npm:terser';
	async function pack(path) {
		const bundled = await bundle(new URL(path, 'file://{{justfile_directory()}}/'));
		const minified = await minify(bundled.code, { ecma: 2020, module: true, toplevel: true });
		return minified.code;
	}
	await Deno.writeTextFile('src/gen/worker.blob.js', "export default '" + await pack('src/worker.src.js') + "'");
	await Deno.writeTextFile('dist/argon2ian.async.min.js', await pack('src/async.ts'));
	await Deno.writeTextFile('dist/argon2ian.sync.min.js', await pack('src/argon2.ts'));
