import {
	normalizeSecret,
	type ParsedOtpAuthUri,
	parseOtpAuthUri,
	type TotpAlgorithm,
} from "./totp";

export type TokenAccount = ParsedOtpAuthUri & {
	id: string;
	createdAt: number;
};

export type TokenFormInput = {
	issuer: string;
	account: string;
	secret: string;
	period: string;
	digits: string;
	algorithm: TotpAlgorithm;
};

export const tokenStorageKey = "2fa-manager.tokens.v1";
export const legacyTokenStorageKeys = ["pulseguard.tokens.v1"];

export function createTokenAccount(
	input: ParsedOtpAuthUri,
	now = Date.now(),
): TokenAccount {
	return {
		id: crypto.randomUUID(),
		issuer: input.issuer,
		account: input.account,
		secret: normalizeSecret(input.secret),
		period: input.period,
		digits: input.digits,
		algorithm: input.algorithm,
		createdAt: now,
	};
}

export function tokenInputFromForm(
	form: TokenFormInput,
	otpUri: string,
): ParsedOtpAuthUri {
	if (otpUri.trim()) {
		return parseOtpAuthUri(otpUri);
	}

	return {
		issuer: form.issuer.trim() || "Authenticator",
		account: form.account.trim() || "Account",
		secret: normalizeSecret(form.secret),
		period: Number(form.period) || 30,
		digits: Number(form.digits) || 6,
		algorithm: form.algorithm,
	};
}

export function isTokenAccount(value: unknown): value is TokenAccount {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<TokenAccount>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.issuer === "string" &&
		typeof candidate.account === "string" &&
		typeof candidate.secret === "string" &&
		typeof candidate.period === "number" &&
		typeof candidate.digits === "number" &&
		["SHA-1", "SHA-256", "SHA-512"].includes(candidate.algorithm ?? "") &&
		typeof candidate.createdAt === "number"
	);
}

export function parseTokenBackup(value: string): TokenAccount[] {
	const parsed = JSON.parse(value) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error("Token backup must be an array");
	}

	return parsed.filter(isTokenAccount);
}

export function mergeTokenAccounts(
	importedAccounts: TokenAccount[],
	currentAccounts: TokenAccount[],
) {
	const known = new Set(currentAccounts.map((item) => item.id));
	return [
		...importedAccounts.filter((item) => !known.has(item.id)),
		...currentAccounts,
	];
}
