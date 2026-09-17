export type IssuerTheme = {
	bg: string;
	text: string;
	border: string;
	glow: string;
};

export type PresetIssuer = {
	name: string;
	initials: string;
	hint?: string;
	period?: number;
	digits?: number;
	algorithm?: "SHA-1" | "SHA-256" | "SHA-512";
	color: {
		bg: string;
		text: string;
		border: string;
	};
};

export const PRESET_ISSUERS: PresetIssuer[] = [
	{
		name: "GitHub",
		initials: "GH",
		hint: "Developer platform",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(20, 20, 19, 0.08)",
			text: "#141413",
			border: "rgba(20, 20, 19, 0.18)",
		},
	},
	{
		name: "Google",
		initials: "GO",
		hint: "Google account",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(217, 119, 87, 0.12)",
			text: "#D97757",
			border: "rgba(217, 119, 87, 0.28)",
		},
	},
	{
		name: "Microsoft",
		initials: "MS",
		hint: "Work or personal",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(106, 155, 204, 0.14)",
			text: "#5284B5",
			border: "rgba(106, 155, 204, 0.3)",
		},
	},
	{
		name: "ChatGPT",
		initials: "AI",
		hint: "OpenAI account",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(120, 140, 93, 0.14)",
			text: "#788C5D",
			border: "rgba(120, 140, 93, 0.3)",
		},
	},
	{
		name: "AWS",
		initials: "AW",
		hint: "Amazon Web Services",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(217, 119, 87, 0.12)",
			text: "#D97757",
			border: "rgba(217, 119, 87, 0.28)",
		},
	},
	{
		name: "Cloudflare",
		initials: "CF",
		hint: "Dashboard security",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(217, 119, 87, 0.12)",
			text: "#D97757",
			border: "rgba(217, 119, 87, 0.28)",
		},
	},
	{
		name: "Discord",
		initials: "DC",
		hint: "Community & chat",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(106, 155, 204, 0.14)",
			text: "#5284B5",
			border: "rgba(106, 155, 204, 0.3)",
		},
	},
	{
		name: "GitLab",
		initials: "GL",
		hint: "GitLab DevOps",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(217, 119, 87, 0.12)",
			text: "#D97757",
			border: "rgba(217, 119, 87, 0.28)",
		},
	},
	{
		name: "Apple",
		initials: "AP",
		hint: "Apple ID security",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(20, 20, 19, 0.08)",
			text: "#141413",
			border: "rgba(20, 20, 19, 0.18)",
		},
	},
	{
		name: "Slack",
		initials: "SL",
		hint: "Workspace access",
		period: 30,
		digits: 6,
		algorithm: "SHA-1",
		color: {
			bg: "rgba(120, 140, 93, 0.14)",
			text: "#788C5D",
			border: "rgba(120, 140, 93, 0.3)",
		},
	},
];

const THEME_PALETTES: IssuerTheme[] = [
	{
		bg: "rgba(217, 119, 87, 0.12)",
		text: "#D97757",
		border: "rgba(217, 119, 87, 0.3)",
		glow: "rgba(217, 119, 87, 0.15)",
	},
	{
		bg: "rgba(120, 140, 93, 0.14)",
		text: "#788C5D",
		border: "rgba(120, 140, 93, 0.32)",
		glow: "rgba(120, 140, 93, 0.15)",
	},
	{
		bg: "rgba(106, 155, 204, 0.14)",
		text: "#5284B5",
		border: "rgba(106, 155, 204, 0.32)",
		glow: "rgba(106, 155, 204, 0.15)",
	},
	{
		bg: "rgba(188, 209, 202, 0.28)",
		text: "#466B60",
		border: "rgba(188, 209, 202, 0.5)",
		glow: "rgba(188, 209, 202, 0.2)",
	},
	{
		bg: "rgba(227, 218, 204, 0.5)",
		text: "#5E5D59",
		border: "rgba(209, 207, 197, 0.8)",
		glow: "rgba(227, 218, 204, 0.3)",
	},
	{
		bg: "rgba(20, 20, 19, 0.08)",
		text: "#141413",
		border: "rgba(20, 20, 19, 0.2)",
		glow: "rgba(20, 20, 19, 0.1)",
	},
	{
		bg: "rgba(163, 107, 79, 0.12)",
		text: "#A36B4F",
		border: "rgba(163, 107, 79, 0.3)",
		glow: "rgba(163, 107, 79, 0.15)",
	},
];

export function getIssuerTheme(issuer: string): IssuerTheme {
	const normalized = (issuer || "Authenticator").trim().toLowerCase();
	let hash = 0;
	for (let i = 0; i < normalized.length; i++) {
		hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
	}
	const index = Math.abs(hash) % THEME_PALETTES.length;
	return THEME_PALETTES[index];
}

export function getIssuerInitials(issuer: string): string {
	const trimmed = (issuer || "2F").trim();
	const words = trimmed.split(/[\s_-]+/).filter(Boolean);
	if (words.length >= 2) {
		return (words[0][0] + words[1][0]).toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}

export function formatCode(code = "", digits = 6): string {
	const fallback = "-".repeat(digits);
	const target = (code || fallback).trim();

	if (target.length === 6) {
		return `${target.slice(0, 3)} ${target.slice(3)}`;
	}
	if (target.length === 8) {
		return `${target.slice(0, 4)} ${target.slice(4)}`;
	}
	if (target.length === 7) {
		return `${target.slice(0, 3)} ${target.slice(3)}`;
	}
	return target.replace(/(.{3})/g, "$1 ").trim();
}
