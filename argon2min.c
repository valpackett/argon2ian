/*
 * Argon2 reference source code package - reference C implementations
 *
 * Copyright 2015
 * Daniel Dinu, Dmitry Khovratovich, Jean-Philippe Aumasson, and Samuel Neves
 *
 * Slightly updated edition of this file for WASM - 2023 Val Packett
 *
 * You may use this work under the terms of a Creative Commons CC0 1.0
 * License/Waiver or the Apache Public License 2.0, at your option. The terms of
 * these licenses can be found at:
 *
 * - CC0 1.0 Universal : https://creativecommons.org/publicdomain/zero/1.0
 * - Apache 2.0        : https://www.apache.org/licenses/LICENSE-2.0
 *
 * You should have received a copy of both of these licenses along with this
 * software. If not, they may be obtained at the above URLs.
 */

#include <string.h>
#include <stdlib.h>
#include <stdio.h>

#include "argon2/src/core.h"

int argon2_ctx(argon2_context *context, argon2_type type) {
    /* 1. Validate all inputs */
    int result = validate_inputs(context);
    uint32_t memory_blocks, segment_length;
    argon2_instance_t instance;

    if (ARGON2_OK != result) {
        return result;
    }

    if (Argon2_d != type && Argon2_i != type && Argon2_id != type) {
        return ARGON2_INCORRECT_TYPE;
    }

    /* 2. Align memory size */
    /* Minimum memory_blocks = 8L blocks, where L is the number of lanes */
    memory_blocks = context->m_cost;

    if (memory_blocks < 2 * ARGON2_SYNC_POINTS * context->lanes) {
        memory_blocks = 2 * ARGON2_SYNC_POINTS * context->lanes;
    }

    segment_length = memory_blocks / (context->lanes * ARGON2_SYNC_POINTS);
    /* Ensure that all segments have equal length */
    memory_blocks = segment_length * (context->lanes * ARGON2_SYNC_POINTS);

    instance.version = context->version;
    instance.memory = NULL;
    instance.passes = context->t_cost;
    instance.memory_blocks = memory_blocks;
    instance.segment_length = segment_length;
    instance.lane_length = segment_length * ARGON2_SYNC_POINTS;
    instance.lanes = context->lanes;
    instance.threads = context->threads;
    instance.type = type;

    if (instance.threads > instance.lanes) {
        instance.threads = instance.lanes;
    }

    /* 3. Initialization: Hashing inputs, allocating memory, filling first
     * blocks
     */
    result = initialize(&instance, context);

    if (ARGON2_OK != result) {
        return result;
    }

    /* 4. Filling memory */
    result = fill_memory_blocks(&instance);

    if (ARGON2_OK != result) {
        return result;
    }
    /* 5. Finalization */
    finalize(context, &instance);

    return ARGON2_OK;
}

int argon2_hash_wasm(const uint32_t t_cost, const uint32_t m_cost,
                     const uint32_t parallelism,
                     const void *pwd, const size_t pwdlen,
                     const void *salt, const size_t saltlen,
                     const void *secret, const size_t secretlen,
                     const void *ad, const size_t adlen,
                     void *hash, const size_t hashlen, argon2_type type,
                     const uint32_t version){

    argon2_context context;
    int result;
    uint8_t *out;

    if (pwdlen > ARGON2_MAX_PWD_LENGTH) {
        return ARGON2_PWD_TOO_LONG;
    }

    if (saltlen > ARGON2_MAX_SALT_LENGTH) {
        return ARGON2_SALT_TOO_LONG;
    }

    if (hashlen > ARGON2_MAX_OUTLEN) {
        return ARGON2_OUTPUT_TOO_LONG;
    }

    if (hashlen < ARGON2_MIN_OUTLEN) {
        return ARGON2_OUTPUT_TOO_SHORT;
    }

    out = malloc(hashlen);
    if (!out) {
        return ARGON2_MEMORY_ALLOCATION_ERROR;
    }

    context.out = (uint8_t *)out;
    context.outlen = (uint32_t)hashlen;
    context.pwd = CONST_CAST(uint8_t *)pwd;
    context.pwdlen = (uint32_t)pwdlen;
    context.salt = CONST_CAST(uint8_t *)salt;
    context.saltlen = (uint32_t)saltlen;
    context.secret = CONST_CAST(uint8_t *)secret;
    context.secretlen = (uint32_t)secretlen;
    context.ad = CONST_CAST(uint8_t *)ad;
    context.adlen = (uint32_t)adlen;
    context.t_cost = t_cost;
    context.m_cost = m_cost;
    context.lanes = parallelism;
    context.threads = parallelism;
    context.allocate_cbk = NULL;
    context.free_cbk = NULL;
    context.flags = ARGON2_DEFAULT_FLAGS | ARGON2_FLAG_CLEAR_PASSWORD | ARGON2_FLAG_CLEAR_SECRET;
    context.version = version;

    result = argon2_ctx(&context, type);

    if (result != ARGON2_OK) {
        clear_internal_memory(out, hashlen);
        free(out);
        return result;
    }

    /* if raw hash requested, write it */
    if (hash) {
        memcpy(hash, out, hashlen);
    }

    clear_internal_memory(out, hashlen);
    free(out);

    return ARGON2_OK;
}

static int argon2_compare(const uint8_t *b1, const uint8_t *b2, size_t len) {
    size_t i;
    uint8_t d = 0U;

    for (i = 0U; i < len; i++) {
        d |= b1[i] ^ b2[i];
    }
    return (int)((1 & ((d - 1) >> 8)) - 1);
}

int argon2_verify_wasm(const uint32_t t_cost, const uint32_t m_cost,
                       const uint32_t parallelism, const void *desired_result, const size_t hashlen,
                       const void *pwd, const size_t pwdlen,
                       const void *salt, const size_t saltlen,
                       const void *secret, const size_t secretlen,
                       const void *ad, const size_t adlen,
                       argon2_type type, const uint32_t version) {

    argon2_context ctx;

    int ret = ARGON2_OK;

    if (pwdlen > ARGON2_MAX_PWD_LENGTH) {
        return ARGON2_PWD_TOO_LONG;
    }

    if (saltlen > ARGON2_MAX_SALT_LENGTH) {
        return ARGON2_SALT_TOO_LONG;
    }

    ctx.out = malloc(hashlen);
    if (!ctx.out) {
        ret = ARGON2_MEMORY_ALLOCATION_ERROR;
        goto fail;
    }
    ctx.outlen = (uint32_t)hashlen;
    ctx.pwd = (uint8_t *)pwd;
    ctx.pwdlen = (uint32_t)pwdlen;
    ctx.salt = CONST_CAST(uint8_t *)salt;
    ctx.saltlen = (uint32_t)saltlen;
    ctx.secret = CONST_CAST(uint8_t *)secret;
    ctx.secretlen = (uint32_t)secretlen;
    ctx.ad = CONST_CAST(uint8_t *)ad;
    ctx.adlen = (uint32_t)adlen;
    ctx.t_cost = t_cost;
    ctx.m_cost = m_cost;
    ctx.lanes = parallelism;
    ctx.threads = parallelism;
    ctx.allocate_cbk = NULL;
    ctx.free_cbk = NULL;
    ctx.flags = ARGON2_DEFAULT_FLAGS | ARGON2_FLAG_CLEAR_PASSWORD | ARGON2_FLAG_CLEAR_SECRET;
    ctx.version = version;

    ret = argon2_verify_ctx(&ctx, (char *)desired_result, type);

fail:
    if (ctx.out) {
        clear_internal_memory(ctx.out, hashlen);
        free(ctx.out);
    }

    return ret;
}

int argon2_verify_ctx(argon2_context *context, const char *hash,
                      argon2_type type) {
    int ret = argon2_ctx(context, type);
    if (ret != ARGON2_OK) {
        return ret;
    }

    if (argon2_compare((uint8_t *)hash, context->out, context->outlen)) {
        return ARGON2_VERIFY_MISMATCH;
    }

    return ARGON2_OK;
}
