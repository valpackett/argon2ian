#!/usr/bin/env -S just --justfile

LLVM := "/usr/local/llvm16/bin"
OPT := "wasm-opt"
ZOPFLI := "zopfli"
OPENSSL := "openssl"
SYSROOT := "/usr/local/share/wasi-sysroot"

# NOTE: literally removing wasm-opt from clang's PATH because ughwtf https://stackoverflow.com/q/75392581

mkwasm:
	PATH="{{LLVM}}" clang -O3 -flto=full --target=wasm32-wasi "--sysroot={{SYSROOT}}" -nostartfiles \
		-Wl,--no-entry \
		-Wl,--export=argon2_hash_wasm -Wl,--export=argon2_verify_wasm -Wl,--export=malloc -Wl,--export=reset_arena \
		-DARGON2_NO_THREADS -DHAVE_EXPLICIT_BZERO \
		-Iargon2/include argon2/src/ref.c argon2/src/core.c argon2/src/blake2/blake2b.c argon2min.c arena.c \
		-o argon2.unopt.wasm
	"{{OPT}}" -Oz -cw -lmu -tnh -uim -ifwl --enable-simd -o dist/argon2.wasm argon2.unopt.wasm
	echo -n 'export default "' > src/gen/argon2.blob.js
	"{{ZOPFLI}}" -i69 -c dist/argon2.wasm | "{{OPENSSL}}" enc -base64 -A >> src/gen/argon2.blob.js
	"{{ZOPFLI}}" -i69 -c dist/argon2.wasm | "{{OPENSSL}}" enc -base64 -A > blob.test
	echo -n '"' >> src/gen/argon2.blob.js
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
