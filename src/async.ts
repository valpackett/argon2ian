import src from './gen/worker.blob.js';
import { ArgonOptions, variant, version } from './types.ts';
export type { ArgonOptions };
export { variant, version };

export class ArgonWorker {
	#rid = 0;
	#promises = new Map<number, [CallableFunction, CallableFunction]>();
	#worker: Worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })), {
		type: 'module',
	});

	constructor() {
		this.#worker.onmessage = (e) => {
			const [rid, suc, res] = e.data;
			const [resolve, reject] = this.#promises.get(rid)!;
			this.#promises.delete(rid);
			(suc ? resolve : reject)(res);
		};
	}

	hash(
		password: Uint8Array,
		salt: Uint8Array,
		options?: ArgonOptions,
	): Promise<Uint8Array> {
		return new Promise((resolve, reject) => {
			this.#promises.set(this.#rid, [resolve, reject]);
			this.#worker.postMessage([this.#rid, false, password, salt, options]);
			this.#rid++;
		});
	}

	verify(
		password: Uint8Array,
		salt: Uint8Array,
		hash: Uint8Array,
		options?: ArgonOptions,
	): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this.#promises.set(this.#rid, [resolve, reject]);
			this.#worker.postMessage([this.#rid, true, password, salt, hash, options]);
			this.#rid++;
		});
	}

	terminate() {
		this.#worker.terminate();
	}
}
