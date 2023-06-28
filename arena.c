#include <stdint.h>
#define ALIGNMENT 8
#define PAGE_SIZE 65536
#define NULL (void*)0

extern void __heap_base;
static void *bump = NULL;

void *m(size_t size) {
	if (bump == NULL)
		bump = &__heap_base;
	void *ret = (void*)(((uintptr_t)bump + (ALIGNMENT - 1)) & ~(ALIGNMENT - 1));
	if (((uintptr_t)ret + size) > __builtin_wasm_memory_size(0) * PAGE_SIZE)
		__builtin_wasm_memory_grow(0, size / PAGE_SIZE);
	bump = (char*)ret + size;
	return ret;
}
