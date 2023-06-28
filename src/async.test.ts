import { assert, assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts';
import { ArgonWorker, variant } from './async.ts';

const enco = new TextEncoder();
const wrk = new ArgonWorker();

Deno.test('hash', async () => {
	assertEquals(
		await wrk.hash(enco.encode('password'), enco.encode('somesalt'), {
			t: 2,
			variant: variant.Argon2i,
		}),
		decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
	);
});

Deno.test('verify', async () => {
	assert(
		await wrk.verify(
			enco.encode('password'),
			enco.encode('somesalt'),
			decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
			{ t: 2, variant: variant.Argon2i },
		),
	);
	assert(
		!await wrk.verify(
			enco.encode('assword'),
			enco.encode('somesalt'),
			decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
			{ t: 2, variant: variant.Argon2i },
		),
	);
});
