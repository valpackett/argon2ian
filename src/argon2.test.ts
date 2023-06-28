import { assert, assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts';
import { blake2b, hash, variant, verify } from './argon2.ts';

const enco = new TextEncoder();

Deno.test('hash', () => {
	assertEquals(
		hash(enco.encode('password'), enco.encode('somesalt'), {
			t: 2,
			variant: variant.Argon2i,
		}),
		decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
	);
});

Deno.test('verify', () => {
	assert(
		verify(
			enco.encode('password'),
			enco.encode('somesalt'),
			decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
			{ t: 2, variant: variant.Argon2i },
		),
	);
	assert(
		!verify(
			enco.encode('assword'),
			enco.encode('somesalt'),
			decode(enco.encode('c1628832147d9720c5bd1cfd61367078729f6dfb6f8fea9ff98158e0d7816ed0')),
			{ t: 2, variant: variant.Argon2i },
		),
	);
});

Deno.test('blake2b', () => {
	assertEquals(
		blake2b(new Uint8Array([0x61]), 64),
		decode(
			enco.encode(
				'333fcb4ee1aa7c115355ec66ceac917c8bfd815bf7587d325aec1864edd24e34d5abe2c6b1b5ee3face62fed78dbef802f2a85cb91d455a8f5249d330853cb3c',
			),
		),
	);
});
