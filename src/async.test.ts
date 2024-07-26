import { assert, assertEquals } from '@std/assert';
import { decodeHex } from '@std/encoding/hex';
import { ArgonWorker, variant } from './async.ts';

const enco = new TextEncoder();

Deno.test('hash', async () => {
	const wrk = new ArgonWorker();
	await wrk.ready;
	assertEquals(
		await wrk.hash(enco.encode('password'), enco.encode('somesalt'), {
			t: 2,
			variant: variant.Argon2i,
		}),
		decodeHex('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0'),
	);
	wrk.terminate();
});

Deno.test('verify', async () => {
	const wrk = new ArgonWorker();
	await wrk.ready;
	assert(
		await wrk.verify(
			enco.encode('password'),
			enco.encode('somesalt'),
			decodeHex('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0'),
			{ t: 2, variant: variant.Argon2i },
		),
	);
	assert(
		!await wrk.verify(
			enco.encode('assword'),
			enco.encode('somesalt'),
			decodeHex('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0'),
			{ t: 2, variant: variant.Argon2i },
		),
	);
	wrk.terminate();
});
