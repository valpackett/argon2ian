export const variant = {
	Argon2d: 0,
	Argon2i: 1,
	Argon2id: 2,
} as const;

export interface ArgonOptions {
	length?: number;
	secret?: Uint8Array;
	ad?: Uint8Array;
	variant?: typeof variant[keyof typeof variant];
	m?: number;
	t?: number;
	p?: number;
}
