import blob from './gen/argon2.blob.js';
import { ArgonOptions, variant, version } from './types.ts';
export type { ArgonOptions };
export { variant, version };

const module = await WebAssembly.compileStreaming(
	new Response((await fetch('data:w/e;base64,' + blob)).body?.pipeThrough(new DecompressionStream('gzip')), {
		headers: { 'content-type': 'application/wasm' },
	}),
);

function helpers(exports: WebAssembly.Exports) {
	return {
		malloc: (size: number): [number, number] => [(exports.malloc as CallableFunction)(size), size],
		buf: ([adr, size]: [number, number]) => new Uint8Array((exports.memory as WebAssembly.Memory).buffer, adr, size),
	};
}

export function hash(
	password: Uint8Array,
	salt: Uint8Array,
	options?: ArgonOptions,
): Uint8Array {
	const instance = new WebAssembly.Instance(module, {});
	const { malloc, buf } = helpers(instance.exports);
	const pwd = malloc(password.length);
	buf(pwd).set(password);
	const sal = malloc(salt.length);
	buf(sal).set(salt);
	const sec: [number, number] = options?.secret ? malloc(options.secret.length) : [0, 0];
	options?.secret && buf(sec).set(options.secret);
	const ad: [number, number] = options?.ad ? malloc(options.ad.length) : [0, 0];
	options?.ad && buf(ad).set(options.ad);
	const result = malloc(options?.length ?? 32);
	const ret = (instance.exports.argon2_hash_wasm as CallableFunction)(
		options?.t ?? 3,
		options?.m ?? (1 << 16),
		1,
		pwd[0],
		pwd[1],
		sal[0],
		sal[1],
		sec[0],
		sec[1],
		ad[0],
		ad[1],
		result[0],
		result[1],
		options?.variant ?? variant.Argon2id,
		options?.version ?? version.V0x13,
	);
	if (ret != 0) throw Error(ret);
	// clone data out to prevent instance/memory leak in case the returned buffer is saved long-term
	const rbuf = new ArrayBuffer(result[1]);
	const rview = new Uint8Array(rbuf);
	rview.set(buf(result));
	return rview;
}

export function verify(
	password: Uint8Array,
	salt: Uint8Array,
	hash: Uint8Array,
	options?: ArgonOptions,
): boolean {
	const instance = new WebAssembly.Instance(module, {});
	const { malloc, buf } = helpers(instance.exports);
	const pwd = malloc(password.length);
	buf(pwd).set(password);
	const sal = malloc(salt.length);
	buf(sal).set(salt);
	const hsh = malloc(hash.length);
	buf(hsh).set(hash);
	const sec: [number, number] = options?.secret ? malloc(options.secret.length) : [0, 0];
	options?.secret && buf(sec).set(options.secret);
	const ad: [number, number] = options?.ad ? malloc(options.ad.length) : [0, 0];
	options?.ad && buf(ad).set(options.ad);
	const ret = (instance.exports.argon2_verify_wasm as CallableFunction)(
		options?.t ?? 3,
		options?.m ?? (1 << 16),
		1,
		hsh[0],
		hsh[1],
		pwd[0],
		pwd[1],
		sal[0],
		sal[1],
		sec[0],
		sec[1],
		ad[0],
		ad[1],
		options?.variant ?? variant.Argon2id,
		options?.version ?? version.V0x13,
	);
	if (ret !== 0 && ret !== -35) throw Error(ret);
	return ret === 0;
}
