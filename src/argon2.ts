import blob from './gen/argon2.blob.js';
import { ArgonOptions, variant } from './types.ts';
export type { ArgonOptions };
export { variant };

const module = await WebAssembly.compileStreaming(
	new Response((await fetch('data:w/e;base64,' + blob)).body?.pipeThrough(new DecompressionStream('gzip')), {
		headers: { 'content-type': 'application/wasm' },
	}),
);

function helpers(exports: WebAssembly.Exports) {
	return {
		malloc: (size: number): [number, number] => [(exports.m as CallableFunction)(size), size],
		buf: ([adr, size]: [number, number]) => new Uint8Array((exports.memory as WebAssembly.Memory).buffer, adr, size),
	};
}

function _hash(
	instance: WebAssembly.Instance,
	password: Uint8Array,
	salt: Uint8Array,
	options?: ArgonOptions,
) {
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
	const m = options?.m ?? (1 << 16);
	const p = options?.p ?? 1;
	const t = options?.t ?? 3;
	if (p < 1) throw Error('p');
	if (t < 1) throw Error('t');
	if (m < 8 * p * 1024 || m % 1024 !== 0) throw Error('m');
	const work = malloc(m * 1024);
	(instance.exports.a as CallableFunction)(
		result[0],
		result[1],
		work[0],
		options?.variant ?? variant.Argon2id,
		m,
		t,
		p,
		pwd[0],
		sal[0],
		pwd[1],
		sal[1],
		sec[0],
		ad[0],
		sec[1],
		ad[1],
	);
	(instance.exports.w as CallableFunction)(pwd[0], pwd[1]);
	return { malloc, buf, result };
}

// clone data out to prevent instance/memory leak in case the returned buffer is saved long-term
function _copyout(buf: (p: [number, number]) => Uint8Array, result: [number, number]): Uint8Array {
	const rbuf = new ArrayBuffer(result[1]);
	const rview = new Uint8Array(rbuf);
	rview.set(buf(result));
	return rview;
}

export function hash(
	password: Uint8Array,
	salt: Uint8Array,
	options?: ArgonOptions,
): Uint8Array {
	const instance = new WebAssembly.Instance(module, {});
	const { buf, result } = _hash(instance, password, salt, options);
	return _copyout(buf, result);
}

export function verify(
	password: Uint8Array,
	salt: Uint8Array,
	hash: Uint8Array,
	options?: ArgonOptions,
): boolean {
	const instance = new WebAssembly.Instance(module, {});
	const { malloc, buf, result } = _hash(instance, password, salt, options);
	if (result[1] !== hash.length) throw Error('lenm');
	const hsh = malloc(hash.length);
	buf(hsh).set(hash);
	if (hash.length === 32) return (instance.exports.t as CallableFunction)(result[0], hsh[0]) === 0;
	if (hash.length === 64) return (instance.exports.s as CallableFunction)(result[0], hsh[0]) === 0;
	throw Error('lenu');
}

export function blake2b(message: Uint8Array, len = 32): Uint8Array {
	if (len < 1 || len > 64) throw Error('lenu');
	const instance = new WebAssembly.Instance(module, {});
	const { malloc, buf } = helpers(instance.exports);
	const msg = malloc(message.length);
	buf(msg).set(message);
	const result = malloc(len);
	(instance.exports.b as CallableFunction)(result[0], len, msg[0], msg[1]);
	(instance.exports.w as CallableFunction)(msg[0], msg[1]);
	return _copyout(buf, result);
}
