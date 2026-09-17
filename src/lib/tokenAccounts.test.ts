import { describe, expect, it, vi } from "vitest";

import {
	createTokenAccount,
	mergeTokenAccounts,
	parseTokenBackup,
	tokenInputFromForm,
} from "./tokenAccounts";

describe("tokenAccounts", () => {
	it("creates normalized token accounts from parsed input", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"00000000-0000-4000-8000-000000000000",
		);

		expect(
			createTokenAccount(
				{
					issuer: "GitHub",
					account: "dev@example.com",
					secret: "abcd 2345",
					period: 30,
					digits: 6,
					algorithm: "SHA-1",
				},
				123,
			),
		).toEqual({
			id: "00000000-0000-4000-8000-000000000000",
			issuer: "GitHub",
			account: "dev@example.com",
			secret: "ABCD2345",
			period: 30,
			digits: 6,
			algorithm: "SHA-1",
			createdAt: 123,
		});
	});

	it("rejects empty or invalid base32 secrets when creating accounts", () => {
		expect(() =>
			createTokenAccount({
				issuer: "Bad",
				account: "test",
				secret: "",
				period: 30,
				digits: 6,
				algorithm: "SHA-1",
			}),
		).toThrow("Secret is required");

		expect(() =>
			createTokenAccount({
				issuer: "Bad",
				account: "test",
				secret: "INVALID1890",
				period: 30,
				digits: 6,
				algorithm: "SHA-1",
			}),
		).toThrow("Secret must be valid Base32");
	});

	it("converts manual form fields into token input defaults", () => {
		expect(
			tokenInputFromForm(
				{
					issuer: "",
					account: "",
					secret: "jbsw y3dp ehpk 3pxp",
					period: "",
					digits: "",
					algorithm: "SHA-1",
				},
				"",
			),
		).toEqual({
			issuer: "Authenticator",
			account: "Account",
			secret: "JBSWY3DPEHPK3PXP",
			period: 30,
			digits: 6,
			algorithm: "SHA-1",
		});
	});

	it("rejects non-array backup files", () => {
		expect(() => parseTokenBackup("{}")).toThrow(
			"Token backup must be an array",
		);
	});

	it("keeps imported accounts ahead of existing accounts without duplicates", () => {
		const existing = createAccount("existing");
		const imported = createAccount("imported");

		expect(mergeTokenAccounts([imported, existing], [existing])).toEqual([
			imported,
			existing,
		]);
	});
});

function createAccount(id: string) {
	return {
		id,
		issuer: id,
		account: `${id}@example.com`,
		secret: "JBSWY3DPEHPK3PXP",
		period: 30,
		digits: 6,
		algorithm: "SHA-1" as const,
		createdAt: 123,
	};
}
