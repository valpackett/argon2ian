import { hash, variant } from './argon2.ts';
import * as ref from 'https://deno.land/x/argon2ian@1.0.5/dist/argon2ian.sync.min.js';
import * as hw from 'npm:hash-wasm';
// import * as a2b from 'npm:argon2-browser';
// import * as atwo from 'https://deno.land/x/argontwo/mod.ts';

const enco = new TextEncoder();
const pass = enco.encode('password');
const salt = enco.encode('somesalt');

Deno.bench('argon2id 1 256M', () => {
	hash(pass, salt, { t: 1, m: 1 << 18, variant: variant.Argon2id });
});

Deno.bench('ref.argon2id 1 256M', () => {
	ref.hash(pass, salt, { t: 1, m: 1 << 18, variant: variant.Argon2id });
});

Deno.bench('hw.argon2id 1 256M', async () => {
	await hw.argon2id({
		salt,
		password: pass,
		parallelism: 1,
		hashLength: 32,
		iterations: 1,
		memorySize: 1 << 18,
		outputType: 'binary',
	});
});

// does not load wasm ('invalid utf-8 sequence' ??)
// Deno.bench('a2b.argon2id 1 256M', async () => {
// 	await a2b.hash({
// 		pass,
// 		salt,
// 		parallelism: 1,
// 		hashLen: 32,
// 		time: 1,
// 		mem: 1 << 18,
// 		type: a2b.ArgonType.Argon2id,
// 	});
// });

// way too slow (1.6s)
// Deno.bench('atwo.argon2id 1 256M', () => {
// 	atwo.hash(pass, salt, { t: 1, m: 1 << 18, variant: atwo.variant.argon2id });
// });
