export const variant = {
	Argon2d: 0,
	Argon2i: 1,
	Argon2id: 2,
} as const;

export const version = {
	V0x10: 0x10,
	V0x13: 0x13,
} as const;

export interface ArgonOptions {
	length?: number;
	secret?: Uint8Array;
	ad?: Uint8Array;
	variant?: typeof variant[keyof typeof variant];
	version?: typeof version[keyof typeof version];
	m?: number;
	t?: number;
}
