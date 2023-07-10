import { hash, verify } from './argon2.ts';

self.onmessage = function (e) {
	const [rid, isVerify, ...args] = e.data;
	try {
		self.postMessage([rid, true, (isVerify ? verify : hash).apply(null, args)]);
	} catch (err) {
		self.postMessage([rid, false, err]);
	}
};

self.postMessage('r');
