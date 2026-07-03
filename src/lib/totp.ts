export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export type TotpConfig = {
	secret: string;
	period?: number;
	digits?: number;
	algorithm?: TotpAlgorithm;
	now?: number;
};

export type ParsedOtpAuthUri = {
	issuer: string;
	account: string;
	secret: string;
	period: number;
	digits: number;
	algorithm: TotpAlgorithm;
};

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const algorithmMap: Record<TotpAlgorithm, string> = {
	"SHA-1": "SHA-1",
	"SHA-256": "SHA-256",
	"SHA-512": "SHA-512",
};

export function normalizeSecret(secret: string) {
	return secret.replace(/[\s=-]/g, "").toUpperCase();
}

export function decodeBase32(secret: string) {
	const normalized = normalizeSecret(secret);

	if (!normalized) {
		throw new Error("Secret is required");
	}

	let bits = "";
	for (const char of normalized) {
		const value = base32Alphabet.indexOf(char);
		if (value === -1) {
			throw new Error("Secret must be valid Base32");
		}
		bits += value.toString(2).padStart(5, "0");
	}

	const bytes: number[] = [];
	for (let index = 0; index + 8 <= bits.length; index += 8) {
		bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
	}

	return new Uint8Array(bytes);
}

export function encodeBase32(bytes: Uint8Array) {
	let bits = "";
	for (const byte of bytes) {
		bits += byte.toString(2).padStart(8, "0");
	}

	let encoded = "";
	for (let index = 0; index < bits.length; index += 5) {
		const chunk = bits.slice(index, index + 5).padEnd(5, "0");
		encoded += base32Alphabet[Number.parseInt(chunk, 2)];
	}

	return encoded;
}

export function createRandomSecret(byteLength = 20) {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return encodeBase32(bytes);
}

export function secondsRemaining(now = Date.now(), period = 30) {
	const elapsed = Math.floor(now / 1000) % period;
	return period - elapsed;
}

export async function generateTotp({
	secret,
	period = 30,
	digits = 6,
	algorithm = "SHA-1",
	now = Date.now(),
}: TotpConfig) {
	const counter = Math.floor(Math.floor(now / 1000) / period);
	const bytes = decodeBase32(secret);
	return generateHotp(bytes, counter, digits, algorithm);
}

export async function generateHotp(
	secretBytes: Uint8Array,
	counter: number,
	digits = 6,
	algorithm: TotpAlgorithm = "SHA-1",
) {
	const counterBytes = new ArrayBuffer(8);
	const view = new DataView(counterBytes);
	view.setUint32(0, Math.floor(counter / 0x100000000));
	view.setUint32(4, counter);
	const keyBytes = new ArrayBuffer(secretBytes.byteLength);
	new Uint8Array(keyBytes).set(secretBytes);

	const key = await crypto.subtle.importKey(
		"raw",
		keyBytes,
		{ name: "HMAC", hash: algorithmMap[algorithm] },
		false,
		["sign"],
	);
	const signature = new Uint8Array(
		await crypto.subtle.sign("HMAC", key, counterBytes),
	);
	const offset = signature[signature.length - 1] & 0x0f;
	const binary =
		((signature[offset] & 0x7f) << 24) |
		((signature[offset + 1] & 0xff) << 16) |
		((signature[offset + 2] & 0xff) << 8) |
		(signature[offset + 3] & 0xff);
	const token = binary % 10 ** digits;

	return token.toString().padStart(digits, "0");
}

export function parseOtpAuthUri(value: string): ParsedOtpAuthUri {
	const url = new URL(value.trim());

	if (url.protocol !== "otpauth:" || url.hostname.toLowerCase() !== "totp") {
		throw new Error("Only otpauth://totp URIs are supported");
	}

	const secret = url.searchParams.get("secret");
	if (!secret) {
		throw new Error("otpauth URI is missing a secret");
	}

	const rawLabel = decodeURIComponent(url.pathname.replace(/^\//, ""));
	const [labelIssuer, ...accountParts] = rawLabel.split(":");
	const issuer =
		url.searchParams.get("issuer") || labelIssuer || "Authenticator";
	const account = accountParts.join(":") || labelIssuer || "Account";
	const period = Number(url.searchParams.get("period") || 30);
	const digits = Number(url.searchParams.get("digits") || 6);
	const rawAlgorithm = (
		url.searchParams.get("algorithm") || "SHA1"
	).toUpperCase();
	const algorithm = normalizeAlgorithm(rawAlgorithm);

	return {
		issuer,
		account,
		secret: normalizeSecret(secret),
		period: Number.isFinite(period) && period > 0 ? period : 30,
		digits: [6, 7, 8].includes(digits) ? digits : 6,
		algorithm,
	};
}

export function buildOtpAuthUri({
	issuer,
	account,
	secret,
	period,
	digits,
	algorithm,
}: ParsedOtpAuthUri) {
	const label = encodeURIComponent(`${issuer}:${account}`);
	const params = new URLSearchParams({
		secret: normalizeSecret(secret),
		issuer,
		period: String(period),
		digits: String(digits),
		algorithm: algorithm.replace("-", ""),
	});

	return `otpauth://totp/${label}?${params.toString()}`;
}

function normalizeAlgorithm(value: string): TotpAlgorithm {
	if (value === "SHA256" || value === "SHA-256") {
		return "SHA-256";
	}
	if (value === "SHA512" || value === "SHA-512") {
		return "SHA-512";
	}
	return "SHA-1";
}
