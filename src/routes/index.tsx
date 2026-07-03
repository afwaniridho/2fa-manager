import { createFileRoute } from "@tanstack/react-router";
import {
	BadgeCheck,
	Check,
	Clock3,
	Copy,
	Download,
	Eye,
	EyeOff,
	FileUp,
	KeyRound,
	LockKeyhole,
	Plus,
	RefreshCcw,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
} from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	createTokenAccount,
	mergeTokenAccounts,
	parseTokenBackup,
	type TokenAccount,
	tokenInputFromForm,
	tokenStorageKey,
} from "../lib/tokenAccounts";
import {
	buildOtpAuthUri,
	createRandomSecret,
	generateTotp,
	secondsRemaining,
	type TotpAlgorithm,
} from "../lib/totp";

export const Route = createFileRoute("/")({ component: Home });

type FormState = {
	issuer: string;
	account: string;
	secret: string;
	period: string;
	digits: string;
	algorithm: TotpAlgorithm;
};

const defaultForm: FormState = {
	issuer: "",
	account: "",
	secret: "",
	period: "30",
	digits: "6",
	algorithm: "SHA-1",
};

function Home() {
	const [accounts, setAccounts] = useState<TokenAccount[]>([]);
	const [form, setForm] = useState<FormState>(defaultForm);
	const [otpUri, setOtpUri] = useState("");
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [codes, setCodes] = useState<Record<string, string>>({});
	const [now, setNow] = useState(Date.now());
	const [showSecret, setShowSecret] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const saved = window.localStorage.getItem(tokenStorageKey);
		if (!saved) {
			return;
		}

		try {
			const valid = parseTokenBackup(saved);
			setAccounts(valid);
			setSelectedId(valid[0]?.id ?? null);
		} catch {
			setMessage("Saved tokens could not be loaded.");
		}
	}, []);

	useEffect(() => {
		window.localStorage.setItem(tokenStorageKey, JSON.stringify(accounts));
	}, [accounts]);

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

	function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	function addAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			const account = createTokenAccount(tokenInputFromForm(form, otpUri));

			setAccounts((current) => [account, ...current]);
			setSelectedId(account.id);
			setForm(defaultForm);
			setOtpUri("");
			setMessage(`${account.issuer} was added.`);
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Token could not be added.",
			);
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

	function removeAccount(id: string) {
		setAccounts((current) => current.filter((item) => item.id !== id));
		setSelectedId((current) => {
			if (current !== id) {
				return current;
			}
			return accounts.find((item) => item.id !== id)?.id ?? null;
		});
	}

	function exportAccounts() {
		const blob = new Blob([JSON.stringify(accounts, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "pulseguard-2fa-backup.json";
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function importAccounts(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		try {
			const valid = parseTokenBackup(await file.text());
			setAccounts((current) => mergeTokenAccounts(valid, current));
			setSelectedId(valid[0]?.id ?? selectedId);
			setMessage(
				`${valid.length} token${valid.length === 1 ? "" : "s"} imported.`,
			);
		} catch {
			setMessage("Import failed. Choose a JSON backup from this app.");
		} finally {
			event.target.value = "";
		}
	}

	return (
		<main className="app-shell">
			<section className="app-frame">
				<header className="app-header">
					<div className="brand-lockup">
						<div className="brand-mark">
							<ShieldCheck className="size-6" />
						</div>
						<div>
							<p className="eyebrow">Private authenticator</p>
							<h1>PulseGuard 2FA</h1>
						</div>
					</div>
					<div className="header-actions">
						<button
							className="toolbar-button"
							type="button"
							onClick={() => fileInputRef.current?.click()}
						>
							<FileUp className="size-4" />
							Import
						</button>
						<button
							className="toolbar-button"
							type="button"
							onClick={exportAccounts}
							disabled={accounts.length === 0}
						>
							<Download className="size-4" />
							Export
						</button>
						<input
							ref={fileInputRef}
							className="hidden"
							type="file"
							accept="application/json"
							onChange={importAccounts}
						/>
					</div>
				</header>

				<div className="workspace-grid">
					<aside className="panel token-panel">
						<div className="panel-heading">
							<div>
								<p className="eyebrow">Vault</p>
								<h2>Tokens</h2>
							</div>
							<div className="status-chip">{accounts.length} saved</div>
						</div>
						<label className="search-box">
							<Search className="size-4" />
							<input
								placeholder="Search issuer or account"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
						</label>
						<div className="token-list">
							{filteredAccounts.length === 0 ? (
								<div className="empty-state">
									<KeyRound className="size-8" />
									<p>No tokens yet</p>
									<span>Add a secret or paste an otpauth URI to start.</span>
								</div>
							) : (
								filteredAccounts.map((item) => (
									<button
										className={`token-row ${
											selectedAccount?.id === item.id ? "token-row-active" : ""
										}`}
										key={item.id}
										type="button"
										onClick={() => setSelectedId(item.id)}
									>
										<div className="token-meta">
											<div className="token-initial">
												{item.issuer.slice(0, 1).toUpperCase()}
											</div>
											<div className="token-text">
												<p>{item.issuer}</p>
												<span>{item.account}</span>
											</div>
										</div>
										<span className="token-preview">
											{formatCode(codes[item.id], item.digits)}
										</span>
									</button>
								))
							)}
						</div>
					</aside>

					<section className="panel code-panel">
						{selectedAccount ? (
							<>
								<div className="code-header">
									<div className="selected-title">
										<div className="privacy-note">
											<LockKeyhole className="size-4" />
											Stored in this browser
										</div>
										<h2>{selectedAccount.issuer}</h2>
										<p>{selectedAccount.account}</p>
									</div>
									<button
										className="icon-button danger-button"
										type="button"
										aria-label="Delete token"
										title="Delete token"
										onClick={() => removeAccount(selectedAccount.id)}
									>
										<Trash2 className="size-5" />
									</button>
								</div>

								<div className="ticket-wrap">
									<div
										className="timer-track"
										style={
											{ "--progress": `${progress}%` } as React.CSSProperties
										}
									/>
									<div className="code-ticket">
										<p>Current code</p>
										<strong>
											{formatCode(selectedCode, selectedAccount.digits)}
										</strong>
									</div>
								</div>

								<div className="code-actions">
									<button
										className="primary-button"
										type="button"
										onClick={() => copyCode(selectedAccount)}
									>
										{copiedId === selectedAccount.id ? (
											<Check className="size-5" />
										) : (
											<Copy className="size-5" />
										)}
										{copiedId === selectedAccount.id ? "Copied" : "Copy code"}
									</button>
									<div className="stat-pill">
										<Clock3 className="size-4" />
										{remaining}s left
									</div>
								</div>

								<div className="metric-grid">
									<Metric label="Hash" value={selectedAccount.algorithm} />
									<Metric
										label="Digits"
										value={String(selectedAccount.digits)}
									/>
									<Metric label="Period" value={`${selectedAccount.period}s`} />
								</div>
								<details className="uri-disclosure">
									<summary>Provisioning URI</summary>
									<p>{buildOtpAuthUri(selectedAccount)}</p>
								</details>
							</>
						) : (
							<div className="empty-code">
								<Sparkles className="size-12" />
								<h2>Ready for your first token</h2>
								<p>
									Add a Base32 secret or paste an otpauth URI. Codes are
									generated locally in this browser.
								</p>
							</div>
						)}
					</section>

					<aside className="panel add-panel">
						<div className="panel-heading">
							<div className="section-icon">
								<Plus className="size-5" />
							</div>
							<div>
								<p className="eyebrow">New token</p>
								<h2>Add token</h2>
							</div>
						</div>

						<form className="token-form" onSubmit={addAccount}>
							<label className="field">
								<span>otpauth URI</span>
								<textarea
									className="input textarea"
									placeholder="otpauth://totp/Issuer:account?secret=..."
									value={otpUri}
									onChange={(event) => setOtpUri(event.target.value)}
								/>
							</label>

							<div className="divider-label">
								<span>or enter manually</span>
							</div>

							<label className="field">
								<span>Issuer</span>
								<input
									className="input"
									placeholder="GitHub"
									value={form.issuer}
									onChange={(event) => updateForm("issuer", event.target.value)}
								/>
							</label>
							<label className="field">
								<span>Account</span>
								<input
									className="input"
									placeholder="name@example.com"
									value={form.account}
									onChange={(event) =>
										updateForm("account", event.target.value)
									}
								/>
							</label>
							<label className="field">
								<span>Secret</span>
								<div className="secret-row">
									<input
										className="input"
										type={showSecret ? "text" : "password"}
										placeholder="Base32 secret"
										value={form.secret}
										onChange={(event) =>
											updateForm("secret", event.target.value)
										}
									/>
									<button
										className="icon-button"
										type="button"
										title={showSecret ? "Hide secret" : "Show secret"}
										aria-label={showSecret ? "Hide secret" : "Show secret"}
										onClick={() => setShowSecret((current) => !current)}
									>
										{showSecret ? (
											<EyeOff className="size-5" />
										) : (
											<Eye className="size-5" />
										)}
									</button>
								</div>
							</label>
							<button
								className="secondary-button"
								type="button"
								onClick={generateSecret}
							>
								<RefreshCcw className="size-4" />
								Generate secret
							</button>

							<details className="advanced-settings">
								<summary>Custom token settings</summary>
								<div className="advanced-grid">
									<label className="field">
										<span>Period</span>
										<select
											className="input"
											value={form.period}
											onChange={(event) =>
												updateForm("period", event.target.value)
											}
										>
											<option value="30">30 seconds</option>
											<option value="45">45 seconds</option>
											<option value="60">60 seconds</option>
										</select>
									</label>
									<label className="field">
										<span>Digits</span>
										<select
											className="input"
											value={form.digits}
											onChange={(event) =>
												updateForm("digits", event.target.value)
											}
										>
											<option value="6">6 digits</option>
											<option value="7">7 digits</option>
											<option value="8">8 digits</option>
										</select>
									</label>
									<label className="field">
										<span>Hash</span>
										<select
											className="input"
											value={form.algorithm}
											onChange={(event) =>
												updateForm(
													"algorithm",
													event.target.value as TotpAlgorithm,
												)
											}
										>
											<option value="SHA-1">SHA-1</option>
											<option value="SHA-256">SHA-256</option>
											<option value="SHA-512">SHA-512</option>
										</select>
									</label>
								</div>
							</details>

							<button className="primary-button save-button" type="submit">
								<BadgeCheck className="size-5" />
								Save token
							</button>
						</form>

						{message ? <div className="message-toast">{message}</div> : null}
					</aside>
				</div>
			</section>
		</main>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="metric-card">
			<p>{label}</p>
			<strong>{value}</strong>
		</div>
	);
}

function formatCode(code = "", digits = 6) {
	return (code || "-".repeat(digits)).replace(/(.{3})/g, "$1 ").trim();
}
