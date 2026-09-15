import { describe, expect, it } from "vitest";
import {
	formatCode,
	getIssuerInitials,
	getIssuerTheme,
	PRESET_ISSUERS,
} from "./uiUtils";

describe("uiUtils", () => {
	it("formats 6-digit codes into 3-3 groups", () => {
		expect(formatCode("123456", 6)).toBe("123 456");
	});

	it("formats 8-digit codes into 4-4 groups", () => {
		expect(formatCode("12345678", 8)).toBe("1234 5678");
	});

	it("falls back gracefully when code is missing", () => {
		expect(formatCode("", 6)).toBe("--- ---");
		expect(formatCode(undefined, 8)).toBe("---- ----");
	});

	it("extracts initials correctly", () => {
		expect(getIssuerInitials("GitHub")).toBe("GI");
		expect(getIssuerInitials("Google Cloud")).toBe("GC");
		expect(getIssuerInitials("Amazon Web Services")).toBe("AW");
		expect(getIssuerInitials("")).toBe("2F");
	});

	it("returns a deterministic theme for issuers", () => {
		const theme1 = getIssuerTheme("GitHub");
		const theme2 = getIssuerTheme("GitHub");
		expect(theme1).toEqual(theme2);
		expect(theme1.text).toBeTruthy();
		expect(theme1.bg).toBeTruthy();
	});

	it("includes well-known preset issuers", () => {
		const names = PRESET_ISSUERS.map((item) => item.name);
		expect(names).toContain("GitHub");
		expect(names).toContain("Google");
		expect(names).toContain("Microsoft");
		expect(names).toContain("ChatGPT");
	});
});
