import { describe, expect, it } from "vitest";

import {
	decodeBase32,
	encodeBase32,
	generateTotp,
	parseOtpAuthUri,
} from "./totp";

describe("totp", () => {
	it("round-trips Base32 secrets", () => {
		const bytes = new Uint8Array([72, 101, 108, 108, 111, 33]);

		expect(decodeBase32(encodeBase32(bytes))).toEqual(bytes);
	});

	it("matches RFC 6238 SHA-1 test vectors", async () => {
		const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
		const vectors = [
			[59_000, "94287082"],
			[1_111_111_109_000, "07081804"],
			[1_111_111_111_000, "14050471"],
			[1_234_567_890_000, "89005924"],
			[2_000_000_000_000, "69279037"],
			[20_000_000_000_000, "65353130"],
		] as const;

		await Promise.all(
			vectors.map(async ([now, expected]) => {
				await expect(
					generateTotp({
						secret,
						now,
						digits: 8,
						period: 30,
						algorithm: "SHA-1",
					}),
				).resolves.toBe(expected);
			}),
		);
	});

	it("parses otpauth TOTP URIs", () => {
		expect(
			parseOtpAuthUri(
				"otpauth://totp/GitHub:dev@example.com?secret=abcd2345&issuer=GitHub&algorithm=SHA256&digits=8&period=60",
			),
		).toEqual({
			issuer: "GitHub",
			account: "dev@example.com",
			secret: "ABCD2345",
			algorithm: "SHA-256",
			digits: 8,
			period: 60,
		});
	});
});
