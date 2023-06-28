#include <monocypher.h>

// WebAssembly converts by-value structs into by-pointer ones, screw that

void a(uint8_t *hash, uint32_t hash_size, void *work_area,
       uint32_t algorithm,
       uint32_t nb_blocks,
       uint32_t nb_passes,
       uint32_t nb_lanes,
       const uint8_t *pass,
       const uint8_t *salt,
       uint32_t pass_size,
       uint32_t salt_size,
       const uint8_t *key,
       const uint8_t *ad,
       uint32_t key_size,
       uint32_t ad_size) {
	crypto_argon2(hash, hash_size, work_area,
		(crypto_argon2_config){
			.algorithm = algorithm,
			.nb_blocks = nb_blocks,
			.nb_passes = nb_passes,
			.nb_lanes = nb_lanes,
		},
		(crypto_argon2_inputs){
			.pass = pass,
			.salt = salt,
			.pass_size = pass_size,
			.salt_size = salt_size,
		},
		(crypto_argon2_extras){
			.key = key,
			.ad = ad,
			.key_size = key_size,
			.ad_size = ad_size,
		}
	);
}
