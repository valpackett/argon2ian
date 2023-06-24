import { assert, assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { decode } from 'https://deno.land/std@0.192.0/encoding/hex.ts';
import { hash, variant, verify, version } from './argon2.ts';

const enco = new TextEncoder();

Deno.test('hash', () => {
	assertEquals(
		hash(enco.encode('password'), enco.encode('somesalt'), {
			t: 2,
			variant: variant.Argon2i,
			version: version.V0x10,
		}),
		decode(enco.encode('f6c4db4a54e2a370627aff3db6176b94a2a209a62c8e36152711802f7b30c694')),
	);
});

Deno.test('verify', () => {
	assert(
		verify(
			enco.encode('password'),
			enco.encode('somesalt'),
			decode(enco.encode('f6c4db4a54e2a370627aff3db6176b94a2a209a62c8e36152711802f7b30c694')),
			{ t: 2, variant: variant.Argon2i, version: version.V0x10 },
		),
	);
	assert(
		!verify(
			enco.encode('assword'),
			enco.encode('somesalt'),
			decode(enco.encode('f6c4db4a54e2a370627aff3db6176b94a2a209a62c8e36152711802f7b30c694')),
			{ t: 2, variant: variant.Argon2i, version: version.V0x10 },
		),
	);
});
