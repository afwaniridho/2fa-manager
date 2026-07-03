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
import { type ChangeEvent, type FormEvent, useRef } from "react";
import { useTokenVault } from "../hooks/useTokenVault";
import { buildOtpAuthUri, type TotpAlgorithm } from "../lib/totp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const vault = useTokenVault();

	function addAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		vault.addAccount();
	}

	async function importAccounts(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		try {
			vault.importAccounts(await file.text());
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
							onClick={vault.exportAccounts}
							disabled={vault.accounts.length === 0}
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
							<div className="status-chip">{vault.accounts.length} saved</div>
						</div>
						<label className="search-box">
							<Search className="size-4" />
							<input
								placeholder="Search issuer or account"
								value={vault.query}
								onChange={(event) => vault.setQuery(event.target.value)}
							/>
						</label>
						<div className="token-list">
							{vault.filteredAccounts.length === 0 ? (
								<div className="empty-state">
									<KeyRound className="size-8" />
									<p>No tokens yet</p>
									<span>Add a secret or paste an otpauth URI to start.</span>
								</div>
							) : (
								vault.filteredAccounts.map((item) => (
									<button
										className={`token-row ${
											vault.selectedAccount?.id === item.id
												? "token-row-active"
												: ""
										}`}
										key={item.id}
										type="button"
										onClick={() => vault.setSelectedId(item.id)}
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
											{formatCode(vault.codes[item.id], item.digits)}
										</span>
									</button>
								))
							)}
						</div>
					</aside>

					<section className="panel code-panel">
						{vault.selectedAccount ? (
							<>
								<div className="code-header">
									<div className="selected-title">
										<div className="privacy-note">
											<LockKeyhole className="size-4" />
											Stored in this browser
										</div>
										<h2>{vault.selectedAccount.issuer}</h2>
										<p>{vault.selectedAccount.account}</p>
									</div>
									<button
										className="icon-button danger-button"
										type="button"
										aria-label="Delete token"
										title="Delete token"
										onClick={() =>
											vault.removeAccount(vault.selectedAccount.id)
										}
									>
										<Trash2 className="size-5" />
									</button>
								</div>

								<div className="ticket-wrap">
									<div
										className="timer-track"
										style={
											{
												"--progress": `${vault.progress}%`,
											} as React.CSSProperties
										}
									/>
									<div className="code-ticket">
										<p>Current code</p>
										<strong>
											{formatCode(
												vault.selectedCode,
												vault.selectedAccount.digits,
											)}
										</strong>
									</div>
								</div>

								<div className="code-actions">
									<button
										className="primary-button"
										type="button"
										onClick={() => vault.copyCode(vault.selectedAccount)}
									>
										{vault.copiedId === vault.selectedAccount.id ? (
											<Check className="size-5" />
										) : (
											<Copy className="size-5" />
										)}
										{vault.copiedId === vault.selectedAccount.id
											? "Copied"
											: "Copy code"}
									</button>
									<div className="stat-pill">
										<Clock3 className="size-4" />
										{vault.remaining}s left
									</div>
								</div>

								<div className="metric-grid">
									<Metric
										label="Hash"
										value={vault.selectedAccount.algorithm}
									/>
									<Metric
										label="Digits"
										value={String(vault.selectedAccount.digits)}
									/>
									<Metric
										label="Period"
										value={`${vault.selectedAccount.period}s`}
									/>
								</div>
								<details className="uri-disclosure">
									<summary>Provisioning URI</summary>
									<p>{buildOtpAuthUri(vault.selectedAccount)}</p>
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
									value={vault.otpUri}
									onChange={(event) => vault.setOtpUri(event.target.value)}
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
									value={vault.form.issuer}
									onChange={(event) =>
										vault.updateForm("issuer", event.target.value)
									}
								/>
							</label>
							<label className="field">
								<span>Account</span>
								<input
									className="input"
									placeholder="name@example.com"
									value={vault.form.account}
									onChange={(event) =>
										vault.updateForm("account", event.target.value)
									}
								/>
							</label>
							<label className="field">
								<span>Secret</span>
								<div className="secret-row">
									<input
										className="input"
										type={vault.showSecret ? "text" : "password"}
										placeholder="Base32 secret"
										value={vault.form.secret}
										onChange={(event) =>
											vault.updateForm("secret", event.target.value)
										}
									/>
									<button
										className="icon-button"
										type="button"
										title={vault.showSecret ? "Hide secret" : "Show secret"}
										aria-label={
											vault.showSecret ? "Hide secret" : "Show secret"
										}
										onClick={() => vault.setShowSecret((current) => !current)}
									>
										{vault.showSecret ? (
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
								onClick={vault.generateSecret}
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
											value={vault.form.period}
											onChange={(event) =>
												vault.updateForm("period", event.target.value)
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
											value={vault.form.digits}
											onChange={(event) =>
												vault.updateForm("digits", event.target.value)
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
											value={vault.form.algorithm}
											onChange={(event) =>
												vault.updateForm(
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

						{vault.message ? (
							<div className="message-toast">{vault.message}</div>
						) : null}
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
