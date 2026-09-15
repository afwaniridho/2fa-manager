import { useEffect, useMemo, useState } from "react";

import {
	createTokenAccount,
	legacyTokenStorageKeys,
	mergeTokenAccounts,
	parseTokenBackup,
	type TokenAccount,
	type TokenFormInput,
	tokenInputFromForm,
	tokenStorageKey,
} from "../lib/tokenAccounts";
import {
	createRandomSecret,
	generateTotp,
	secondsRemaining,
} from "../lib/totp";

export type TokenFormState = TokenFormInput;

export const defaultTokenForm: TokenFormState = {
	issuer: "",
	account: "",
	secret: "",
	period: "30",
	digits: "6",
	algorithm: "SHA-1",
};

export function useTokenVault() {
	const [accounts, setAccounts] = useState<TokenAccount[]>([]);
	const [form, setForm] = useState<TokenFormState>(defaultTokenForm);
	const [otpUri, setOtpUri] = useState("");
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [codes, setCodes] = useState<Record<string, string>>({});
	const [now, setNow] = useState(Date.now());
	const [showSecret, setShowSecret] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [deletedAccount, setDeletedAccount] = useState<TokenAccount | null>(
		null,
	);
	const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);

	useEffect(() => {
		if (!message) {
			return;
		}
		const timer = window.setTimeout(() => setMessage(""), 3200);
		return () => window.clearTimeout(timer);
	}, [message]);

	useEffect(() => {
		const saved =
			window.localStorage.getItem(tokenStorageKey) ??
			legacyTokenStorageKeys
				.map((key) => window.localStorage.getItem(key))
				.find((value): value is string => value !== null);

		if (!saved) {
			setHasLoadedAccounts(true);
			return;
		}

		try {
			const valid = parseTokenBackup(saved);
			setAccounts(valid);
			setSelectedId(valid[0]?.id ?? null);
		} catch {
			setMessage("Saved tokens could not be loaded.");
		} finally {
			setHasLoadedAccounts(true);
		}
	}, []);

	useEffect(() => {
		if (!hasLoadedAccounts) {
			return;
		}

		window.localStorage.setItem(tokenStorageKey, JSON.stringify(accounts));
		for (const key of legacyTokenStorageKeys) {
			window.localStorage.removeItem(key);
		}
	}, [accounts, hasLoadedAccounts]);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		let active = true;

		async function refreshCodes() {
			const entries = await Promise.all(
				accounts.map(async (item) => {
					try {
						const code = await generateTotp({
							secret: item.secret,
							period: item.period,
							digits: item.digits,
							algorithm: item.algorithm,
							now,
						});
						return [item.id, code] as const;
					} catch {
						return [item.id, "------"] as const;
					}
				}),
			);

			if (active) {
				setCodes(Object.fromEntries(entries));
			}
		}

		void refreshCodes();
		return () => {
			active = false;
		};
	}, [accounts, now]);

	const filteredAccounts = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) {
			return accounts;
		}

		return accounts.filter((item) =>
			`${item.issuer} ${item.account}`.toLowerCase().includes(needle),
		);
	}, [accounts, query]);

	const selectedAccount =
		accounts.find((item) => item.id === selectedId) ?? accounts[0] ?? null;
	const selectedCode = selectedAccount ? codes[selectedAccount.id] : "";
	const remaining = secondsRemaining(now, selectedAccount?.period ?? 30);
	const progress = selectedAccount
		? ((selectedAccount.period - remaining) / selectedAccount.period) * 100
		: 0;

	function updateForm<K extends keyof TokenFormState>(
		key: K,
		value: TokenFormState[K],
	) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	function addAccount(): boolean {
		try {
			const account = createTokenAccount(tokenInputFromForm(form, otpUri));

			setAccounts((current) => [account, ...current]);
			setSelectedId(account.id);
			setForm(defaultTokenForm);
			setOtpUri("");
			setMessage(`${account.issuer} was added successfully.`);
			return true;
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Token could not be added.",
			);
			return false;
		}
	}

	function generateSecret() {
		updateForm("secret", createRandomSecret());
		setMessage("A new 160-bit Base32 secret is ready.");
	}

	async function copyCode(account: TokenAccount) {
		const code = codes[account.id];
		if (!code) {
			return;
		}

		try {
			await navigator.clipboard.writeText(code);
			setCopiedId(account.id);
			setMessage(`${account.issuer} code copied.`);
			window.setTimeout(() => setCopiedId(null), 1400);
		} catch {
			setMessage("Code could not be copied. Select it and copy manually.");
		}
	}

	async function copyText(text: string, label = "Text") {
		if (!text) {
			return false;
		}
		try {
			await navigator.clipboard.writeText(text);
			setMessage(`${label} copied to clipboard.`);
			return true;
		} catch {
			setMessage(`Could not copy ${label.toLowerCase()}.`);
			return false;
		}
	}

	function clearMessage() {
		setMessage("");
	}

	function removeAccount(id: string) {
		const target = accounts.find((item) => item.id === id);
		if (!target) {
			return;
		}

		setDeletedAccount(target);
		setAccounts((current) => current.filter((item) => item.id !== id));
		setSelectedId((current) => {
			if (current !== id) {
				return current;
			}
			return accounts.find((item) => item.id !== id)?.id ?? null;
		});
		setMessage(`${target.issuer} token deleted.`);
	}

	function undoDelete() {
		if (!deletedAccount) {
			return;
		}
		const toRestore = deletedAccount;
		setAccounts((current) => [toRestore, ...current]);
		setSelectedId(toRestore.id);
		setDeletedAccount(null);
		setMessage(`${toRestore.issuer} restored.`);
	}

	function exportAccounts() {
		const blob = new Blob([JSON.stringify(accounts, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "2fa-manager-backup.json";
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function importAccounts(value: string) {
		try {
			const valid = parseTokenBackup(value);
			setAccounts((current) => mergeTokenAccounts(valid, current));
			setSelectedId(valid[0]?.id ?? selectedId);
			setMessage(
				`${valid.length} token${valid.length === 1 ? "" : "s"} imported.`,
			);
		} catch {
			setMessage("Import failed. Choose a JSON backup from this app.");
		}
	}

	return {
		accounts,
		codes,
		copiedId,
		filteredAccounts,
		form,
		importAccounts,
		message,
		otpUri,
		progress,
		query,
		remaining,
		selectedAccount,
		selectedCode,
		showSecret,
		addAccount,
		clearMessage,
		copyCode,
		copyText,
		exportAccounts,
		generateSecret,
		removeAccount,
		setOtpUri,
		setQuery,
		setSelectedId,
		setShowSecret,
		deletedAccount,
		undoDelete,
		updateForm,
	};
}
