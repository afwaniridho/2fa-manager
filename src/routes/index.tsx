import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	BadgeCheck,
	Check,
	ChevronDown,
	Copy,
	Download,
	Eye,
	EyeOff,
	FileUp,
	KeyRound,
	Layers,
	Plus,
	RefreshCcw,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTokenVault } from "../hooks/useTokenVault";
import {
	buildOtpAuthUri,
	parseOtpAuthUri,
	type TotpAlgorithm,
} from "../lib/totp";
import {
	formatCode,
	getIssuerInitials,
	getIssuerTheme,
	PRESET_ISSUERS,
	type PresetIssuer,
} from "../lib/uiUtils";

export const Route = createFileRoute("/")({ component: Home });

function MorphIcon({
	isActive,
	ActiveIcon,
	InactiveIcon,
	className = "size-3.5",
}: {
	isActive: boolean;
	ActiveIcon: React.ComponentType<{ className?: string }>;
	InactiveIcon: React.ComponentType<{ className?: string }>;
	className?: string;
}) {
	return (
		<span className="morph-icon-wrap" aria-hidden="true">
			<span
				className={`morph-icon-layer ${isActive ? "morph-in" : "morph-out"}`}
			>
				<ActiveIcon className={className} />
			</span>
			<span
				className={`morph-icon-layer ${!isActive ? "morph-in" : "morph-out"}`}
			>
				<InactiveIcon className={className} />
			</span>
		</span>
	);
}

function Home() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const vault = useTokenVault();

	const [mobileTab, setMobileTab] = useState<"tokens" | "code" | "add">(
		"tokens",
	);
	const [addMode, setAddMode] = useState<"uri" | "manual">("uri");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [copiedUri, setCopiedUri] = useState(false);

	const currentSelectedId = vault.selectedAccount?.id;
	const [lastSelectedId, setLastSelectedId] = useState(currentSelectedId);
	if (currentSelectedId !== lastSelectedId) {
		setLastSelectedId(currentSelectedId);
		setConfirmDelete(false);
	}

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const isFormElement =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement;

			if (event.key === "Escape") {
				if (confirmDelete) {
					setConfirmDelete(false);
					return;
				}
				if (vault.query) {
					vault.setQuery("");
					searchInputRef.current?.blur();
				}
				return;
			}

			if (
				!isFormElement &&
				(event.key === "/" ||
					((event.metaKey || event.ctrlKey) && event.key === "k"))
			) {
				event.preventDefault();
				setMobileTab("tokens");
				searchInputRef.current?.focus();
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [confirmDelete, vault.query, vault.setQuery]);

	function handleAddAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const success = vault.addAccount();
		if (success) {
			setMobileTab("code");
		}
	}

	async function handleImportAccounts(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		try {
			vault.importAccounts(await file.text());
			setMobileTab("tokens");
		} finally {
			event.target.value = "";
		}
	}

	async function handleCopyUri() {
		if (!vault.selectedAccount) {
			return;
		}
		const uri = buildOtpAuthUri(vault.selectedAccount);
		const success = await vault.copyText(uri, "Provisioning URI");
		if (success) {
			setCopiedUri(true);
			window.setTimeout(() => setCopiedUri(false), 1500);
		}
	}

	function handleSelectPreset(preset: PresetIssuer) {
		vault.updateForm("issuer", preset.name);
		if (preset.period) {
			vault.updateForm("period", String(preset.period));
		}
		if (preset.digits) {
			vault.updateForm("digits", String(preset.digits));
		}
		if (preset.algorithm) {
			vault.updateForm("algorithm", preset.algorithm);
		}
	}

	const detectedUriPreview = useMemo(() => {
		if (!vault.otpUri.trim().startsWith("otpauth://")) {
			return null;
		}
		try {
			const parsed = parseOtpAuthUri(vault.otpUri);
			return `${parsed.issuer} (${parsed.account})`;
		} catch {
			return null;
		}
	}, [vault.otpUri]);

	const timerUrgencyClass =
		vault.remaining <= 5
			? "timer-alert"
			: vault.remaining <= 10
				? "timer-warning"
				: "timer-normal";

	const timerCircumference = 113.1;
	const timerPeriod = vault.selectedAccount?.period || 30;
	const timerOffset = timerCircumference * (1 - vault.remaining / timerPeriod);
	const isTimerResetting = vault.remaining === timerPeriod;

	return (
		<main className="app-shell">
			<div className="app-frame">
				<header className="app-header">
					<div className="brand-lockup">
						<div className="brand-mark" aria-hidden="true">
							<ShieldCheck className="size-6" />
						</div>
						<div className="brand-text">
							<h1>2FA Manager</h1>
							<div className="brand-badge-row">
								<span className="secure-badge">
									<span className="secure-dot" />
									Browser TOTP authenticator
								</span>
							</div>
						</div>
					</div>

					<div className="header-actions">
						<button
							className="toolbar-button"
							type="button"
							onClick={() => fileInputRef.current?.click()}
							title="Import token backup file"
						>
							<FileUp className="size-4" />
							Import
						</button>
						<button
							className="toolbar-button"
							type="button"
							onClick={vault.exportAccounts}
							disabled={vault.accounts.length === 0}
							title="Export JSON backup containing unencrypted secrets"
						>
							<Download className="size-4" />
							Export
						</button>
						<input
							ref={fileInputRef}
							className="hidden"
							type="file"
							accept="application/json"
							onChange={handleImportAccounts}
						/>
					</div>
				</header>

				<div className="workspace-grid">
					{/* Panel 1: Vault / Tokens Sidebar */}
					<aside
						className={`panel token-panel ${mobileTab !== "tokens" ? "mobile-hidden" : ""}`}
					>
						<div className="panel-header">
							<div className="panel-title-wrap">
								<div className="panel-icon-badge" aria-hidden="true">
									<Layers className="size-4" />
								</div>
								<div>
									<h2 className="panel-title">Vault</h2>
									<p className="panel-subtitle">Accounts</p>
								</div>
							</div>
							<div className="panel-header-actions">
								<button
									type="button"
									className="toolbar-button tablet-only"
									onClick={() => setMobileTab("add")}
									title="Add new token"
								>
									<Plus className="size-3.5" />
									<span>Add</span>
								</button>
								<div className="count-chip">
									<span>{vault.accounts.length}</span>
									<span>saved</span>
								</div>
							</div>
						</div>

						<label className="search-container">
							<Search className="size-4" />
							<input
								ref={searchInputRef}
								className="search-input"
								placeholder="Search tokens..."
								value={vault.query}
								onChange={(event) => vault.setQuery(event.target.value)}
							/>
							{vault.query ? (
								<button
									type="button"
									className="search-clear-btn"
									aria-label="Clear search"
									onClick={() => {
										vault.setQuery("");
										searchInputRef.current?.focus();
									}}
								>
									<X className="size-3" />
								</button>
							) : (
								<kbd className="kbd-hint">/</kbd>
							)}
						</label>

						<div className="token-list">
							{vault.filteredAccounts.length === 0 ? (
								<div className="empty-state">
									<div className="empty-state-icon">
										<KeyRound className="size-6" />
									</div>
									{vault.query ? (
										<>
											<h3>No matches</h3>
											<p>No tokens matched &ldquo;{vault.query}&rdquo;</p>
											<button
												type="button"
												className="toolbar-button"
												style={{ marginTop: "8px" }}
												onClick={() => vault.setQuery("")}
											>
												Clear search
											</button>
										</>
									) : (
										<>
											<h3>No tokens yet</h3>
											<p>Add a secret key or paste an otpauth URI to begin.</p>
											<button
												type="button"
												className="toolbar-button"
												style={{ marginTop: "8px" }}
												onClick={() => setMobileTab("add")}
											>
												<Plus className="size-3.5" />
												Add token
											</button>
										</>
									)}
								</div>
							) : (
								vault.filteredAccounts.map((item) => {
									const theme = getIssuerTheme(item.issuer);
									const isSelected = vault.selectedAccount?.id === item.id;
									const isCopied = vault.copiedId === item.id;
									const currentCode = vault.codes[item.id] || "";

									return (
										<div
											className={`token-row ${isSelected ? "token-row-active" : ""}`}
											key={item.id}
										>
											<button
												type="button"
												className="token-select-btn"
												onClick={() => {
													vault.setSelectedId(item.id);
													setMobileTab("code");
												}}
												aria-label={`Select ${item.issuer} account`}
											>
												<div
													className="token-avatar"
													style={{
														backgroundColor: theme.bg,
														color: theme.text,
														border: `1px solid ${theme.border}`,
													}}
													aria-hidden="true"
												>
													{getIssuerInitials(item.issuer)}
												</div>
												<div className="token-info">
													<span className="token-issuer">{item.issuer}</span>
													<span className="token-account">{item.account}</span>
												</div>
											</button>

											<button
												type="button"
												className={`token-quick-copy-chip ${isCopied ? "token-chip-copied" : ""}`}
												title={`Copy code for ${item.issuer}`}
												aria-label={`Copy code for ${item.issuer}`}
												onClick={(event) => {
													event.stopPropagation();
													vault.copyCode(item);
												}}
											>
												<span className="token-chip-code">
													{formatCode(currentCode, item.digits)}
												</span>
												<MorphIcon
													isActive={isCopied}
													ActiveIcon={Check}
													InactiveIcon={Copy}
													className="size-3.5 text-inherit"
												/>
											</button>
										</div>
									);
								})
							)}
						</div>
					</aside>

					{/* Panel 2: Focus Stage / Active Code */}
					<section
						className={`panel code-panel ${mobileTab === "add" ? "tablet-hidden" : ""} ${mobileTab !== "code" ? "mobile-hidden" : ""}`}
					>
						<div className="mobile-back-bar">
							<button
								type="button"
								className="mobile-back-btn"
								onClick={() => setMobileTab("tokens")}
							>
								<ArrowLeft className="size-3.5" />
								Back to tokens
							</button>
						</div>

						{vault.selectedAccount ? (
							<>
								<div>
									<div className="focus-account-header">
										<div className="focus-issuer-row">
											<div
												className="focus-avatar"
												style={{
													backgroundColor: getIssuerTheme(
														vault.selectedAccount.issuer,
													).bg,
													color: getIssuerTheme(vault.selectedAccount.issuer)
														.text,
													border: `1px solid ${
														getIssuerTheme(vault.selectedAccount.issuer).border
													}`,
												}}
												aria-hidden="true"
											>
												{getIssuerInitials(vault.selectedAccount.issuer)}
											</div>
											<div className="focus-issuer-details">
												<h2>{vault.selectedAccount.issuer}</h2>
												<p>{vault.selectedAccount.account}</p>
											</div>
										</div>

										<div className="focus-header-actions">
											<button
												type="button"
												className="toolbar-button tablet-only"
												onClick={() => setMobileTab("add")}
											>
												<Plus className="size-3.5" />
												<span>Add token</span>
											</button>
											{!confirmDelete ? (
												<button
													className="icon-button danger-button"
													type="button"
													aria-label="Delete token"
													title="Delete token"
													onClick={() => setConfirmDelete(true)}
												>
													<Trash2 className="size-4" />
												</button>
											) : null}
										</div>
									</div>

									{confirmDelete ? (
										<div className="delete-confirm-banner" role="alert">
											<div className="delete-confirm-text">
												<AlertTriangle className="size-4 text-rose-400" />
												<span>
													Delete <strong>{vault.selectedAccount.issuer}</strong>
													?
												</span>
											</div>
											<div className="delete-confirm-actions">
												<button
													type="button"
													className="btn-secondary btn-sm"
													onClick={() => setConfirmDelete(false)}
												>
													Cancel
												</button>
												<button
													type="button"
													className="btn-danger btn-sm"
													onClick={() => {
														vault.removeAccount(vault.selectedAccount.id);
														setConfirmDelete(false);
													}}
												>
													Confirm Delete
												</button>
											</div>
										</div>
									) : null}
								</div>

								<div className="code-ticket">
									<div className="ticket-progress-bar">
										<div
											className={`ticket-progress-fill ${timerUrgencyClass}`}
											style={{
												width: `${vault.progress}%`,
												transition: isTimerResetting ? "none" : undefined,
											}}
										/>
									</div>

									<div className="ticket-content">
										<div className="timer-ring-container">
											<svg
												className="timer-ring-svg"
												viewBox="0 0 44 44"
												aria-hidden="true"
											>
												<title>Timer countdown</title>
												<circle
													className="timer-ring-bg"
													cx="22"
													cy="22"
													r="18"
												/>
												<circle
													className={`timer-ring-progress ${timerUrgencyClass}`}
													cx="22"
													cy="22"
													r="18"
													style={{
														strokeDasharray: timerCircumference,
														strokeDashoffset: timerOffset,
														transition: isTimerResetting ? "none" : undefined,
													}}
												/>
											</svg>
											<span
												className={`timer-ring-label ${
													vault.remaining <= 5
														? "text-rose-600"
														: vault.remaining <= 10
															? "text-amber-700"
															: "text-ink"
												}`}
											>
												{vault.remaining}s
											</span>
										</div>

										<button
											type="button"
											className="code-digits-btn"
											onClick={() => vault.copyCode(vault.selectedAccount)}
											title="Click to copy code"
											aria-label={`Copy code ${vault.selectedCode}`}
										>
											<strong className="code-digits">
												{formatCode(
													vault.selectedCode,
													vault.selectedAccount.digits,
												)}
											</strong>
										</button>

										<div className="copy-action-row">
											<button
												className="primary-button ticket-copy-btn"
												type="button"
												onClick={() => vault.copyCode(vault.selectedAccount)}
											>
												<MorphIcon
													isActive={vault.copiedId === vault.selectedAccount.id}
													ActiveIcon={Check}
													InactiveIcon={Copy}
													className="size-4 text-inherit"
												/>
												<span>
													{vault.copiedId === vault.selectedAccount.id
														? "Copied to clipboard"
														: "Copy code"}
												</span>
											</button>
										</div>
									</div>
								</div>

								<div className="metric-grid">
									<div className="metric-card">
										<span className="metric-label">Algorithm</span>
										<span className="metric-value">
											{vault.selectedAccount.algorithm}
										</span>
									</div>
									<div className="metric-card">
										<span className="metric-label">Digits</span>
										<span className="metric-value">
											{vault.selectedAccount.digits}
										</span>
									</div>
									<div className="metric-card">
										<span className="metric-label">Period</span>
										<span className="metric-value">
											{vault.selectedAccount.period}s
										</span>
									</div>
								</div>

								<details className="uri-disclosure">
									<summary>
										<span>Provisioning URI</span>
										<ChevronDown className="size-4 text-slate-400" />
									</summary>
									<div className="uri-disclosure-body">
										<div className="uri-text">
											{buildOtpAuthUri(vault.selectedAccount)}
										</div>
										<button
											type="button"
											className="secondary-button"
											onClick={handleCopyUri}
										>
											<MorphIcon
												isActive={copiedUri}
												ActiveIcon={Check}
												InactiveIcon={Copy}
												className="size-3.5 text-inherit"
											/>
											<span>{copiedUri ? "URI copied" : "Copy URI"}</span>
										</button>
									</div>
								</details>
							</>
						) : (
							<div className="empty-state">
								<div className="empty-state-icon">
									<Sparkles className="size-7" />
								</div>
								<h3>Ready for your first token</h3>
								<p>
									Add a secret key or paste an otpauth URI. All cryptographic
									TOTP calculations happen locally in this browser session.
								</p>
								<button
									type="button"
									className="primary-button"
									style={{ marginTop: "12px" }}
									onClick={() => setMobileTab("add")}
								>
									<Plus className="size-4" />
									Add token now
								</button>
							</div>
						)}
					</section>

					{/* Panel 3: Add Token Inspector */}
					<aside
						className={`panel add-panel ${mobileTab !== "add" ? "tablet-hidden mobile-hidden" : ""}`}
					>
						<div className="panel-header">
							<div className="panel-title-wrap">
								<div className="panel-icon-badge" aria-hidden="true">
									<Plus className="size-4" />
								</div>
								<div>
									<h2 className="panel-title">Add Token</h2>
									<p className="panel-subtitle">New authenticator</p>
								</div>
							</div>
							<button
								type="button"
								className="toolbar-button tablet-only"
								onClick={() => setMobileTab("code")}
							>
								<ArrowLeft className="size-3.5" />
								<span>View code</span>
							</button>
						</div>

						<div className="segmented-mode-bar" role="tablist">
							<button
								type="button"
								role="tab"
								aria-selected={addMode === "uri"}
								className={`segmented-mode-btn ${addMode === "uri" ? "segmented-mode-btn-active" : ""}`}
								onClick={() => setAddMode("uri")}
							>
								URI / Quick import
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={addMode === "manual"}
								className={`segmented-mode-btn ${addMode === "manual" ? "segmented-mode-btn-active" : ""}`}
								onClick={() => setAddMode("manual")}
							>
								Manual setup
							</button>
						</div>

						<form className="token-form" onSubmit={handleAddAccount}>
							{addMode === "uri" ? (
								<label className="field">
									<span className="field-label">otpauth URI / text</span>
									<textarea
										className="input textarea"
										placeholder="otpauth://totp/Service:account?secret=JBSWY3DPEHPK3PXP"
										value={vault.otpUri}
										onChange={(event) => vault.setOtpUri(event.target.value)}
									/>
									{detectedUriPreview ? (
										<div className="detected-preview-pill">
											<Check className="size-3.5" />
											<span>Detected: {detectedUriPreview}</span>
										</div>
									) : null}
								</label>
							) : (
								<>
									<div className="preset-section">
										<div className="preset-title-row">
											<span className="preset-section-label">
												Popular issuers
											</span>
											{vault.form.issuer ? (
												<button
													type="button"
													className="preset-clear-btn"
													onClick={() => vault.updateForm("issuer", "")}
												>
													Clear
												</button>
											) : null}
										</div>
										<div className="preset-chips-grid">
											{PRESET_ISSUERS.map((preset) => {
												const isSelected =
													vault.form.issuer.trim().toLowerCase() ===
													preset.name.toLowerCase();
												return (
													<button
														key={preset.name}
														type="button"
														className={`preset-chip ${isSelected ? "preset-chip-active" : ""}`}
														onClick={() => handleSelectPreset(preset)}
														aria-pressed={isSelected}
													>
														<span
															className="preset-chip-badge"
															style={{
																backgroundColor: preset.color.bg,
																color: preset.color.text,
																border: `1px solid ${preset.color.border}`,
															}}
															aria-hidden="true"
														>
															{preset.initials}
														</span>
														<span className="preset-chip-name">
															{preset.name}
														</span>
													</button>
												);
											})}
										</div>
									</div>

									<label className="field">
										<span className="field-label">Issuer</span>
										<input
											className="input"
											placeholder="e.g. GitHub, Google, AWS"
											value={vault.form.issuer}
											onChange={(event) =>
												vault.updateForm("issuer", event.target.value)
											}
										/>
									</label>

									<label className="field">
										<span className="field-label">Account name</span>
										<input
											className="input"
											placeholder="e.g. name@company.com"
											value={vault.form.account}
											onChange={(event) =>
												vault.updateForm("account", event.target.value)
											}
										/>
									</label>

									<label className="field">
										<span className="field-label">Base32 Secret</span>
										<div className="secret-input-row">
											<input
												className="input"
												type={vault.showSecret ? "text" : "password"}
												placeholder="Base32 key (e.g. JBSWY3DPEHPK3PXP)"
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
												onClick={() =>
													vault.setShowSecret((current) => !current)
												}
											>
												<MorphIcon
													isActive={vault.showSecret}
													ActiveIcon={EyeOff}
													InactiveIcon={Eye}
													className="size-4 text-inherit"
												/>
											</button>
										</div>
									</label>

									<button
										className="secondary-button"
										type="button"
										onClick={vault.generateSecret}
									>
										<RefreshCcw className="size-3.5" />
										Generate secret
									</button>

									<details className="advanced-settings-block">
										<summary>
											<span>Custom token parameters</span>
											<ChevronDown className="size-4 text-slate-400" />
										</summary>
										<div className="advanced-grid">
											<label className="field">
												<span className="field-label">Period</span>
												<select
													className="input"
													value={vault.form.period}
													onChange={(event) =>
														vault.updateForm("period", event.target.value)
													}
												>
													<option value="30">30s</option>
													<option value="45">45s</option>
													<option value="60">60s</option>
												</select>
											</label>
											<label className="field">
												<span className="field-label">Digits</span>
												<select
													className="input"
													value={vault.form.digits}
													onChange={(event) =>
														vault.updateForm("digits", event.target.value)
													}
												>
													<option value="6">6</option>
													<option value="7">7</option>
													<option value="8">8</option>
												</select>
											</label>
											<label className="field">
												<span className="field-label">Hash</span>
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
								</>
							)}

							<button
								className="primary-button"
								type="submit"
								style={{ width: "100%", marginTop: "4px" }}
							>
								<BadgeCheck className="size-4" />
								Save token
							</button>
						</form>
					</aside>
				</div>
			</div>

			{/* Editorial Dark Ink Footer (design.md) */}
			<footer className="app-footer">
				<div className="footer-content">
					<div className="footer-col">
						<h4>Stored in your browser</h4>
						<p>
							Codes are calculated locally with the Web Crypto API. Saved
							secrets and JSON backups are not encrypted. Use a trusted device
							and protect your backup files.
						</p>
					</div>
					<div className="footer-col">
						<h4>Keyboard Shortcuts</h4>
						<div className="footer-key-list">
							<div className="footer-key-row">
								<kbd className="footer-kbd">/</kbd>
								<span>Focus token search</span>
							</div>
							<div className="footer-key-row">
								<kbd className="footer-kbd">Esc</kbd>
								<span>Clear search / dismiss</span>
							</div>
							<div className="footer-key-row">
								<kbd className="footer-kbd">⌘K</kbd>
								<span>Quick search</span>
							</div>
						</div>
					</div>
					<div className="footer-col">
						<h4>Security Standards</h4>
						<div className="footer-meta">
							<span>RFC 6238 TOTP Standard</span>
							<span>SHA-1 / SHA-256 / SHA-512</span>
							<a href="https://github.com/afwaniridho/2fa-manager">
								View source on GitHub
							</a>
						</div>
					</div>
				</div>
			</footer>

			{/* Floating Toast Notification */}
			{vault.message ? (
				<div className="toast-container" aria-live="polite">
					<div className="toast-notification">
						<div className="toast-icon">
							<Sparkles className="size-4" />
						</div>
						<span className="toast-text">{vault.message}</span>
						{vault.deletedAccount ? (
							<button
								type="button"
								className="toast-undo-btn"
								onClick={vault.undoDelete}
							>
								Undo
							</button>
						) : null}
						<button
							type="button"
							className="toast-close"
							aria-label="Dismiss notification"
							onClick={vault.clearMessage}
						>
							<X className="size-3" />
						</button>
					</div>
				</div>
			) : null}

			{/* Mobile Bottom Navigation (Phone Ergonomics) */}
			<nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
				<button
					type="button"
					className={`mobile-bottom-tab ${mobileTab === "tokens" ? "mobile-bottom-tab-active" : ""}`}
					onClick={() => setMobileTab("tokens")}
				>
					<Layers className="size-4" />
					<span>Tokens</span>
					<span className="mobile-nav-badge">{vault.accounts.length}</span>
				</button>
				<button
					type="button"
					className={`mobile-bottom-tab ${mobileTab === "code" ? "mobile-bottom-tab-active" : ""}`}
					onClick={() => setMobileTab("code")}
				>
					<KeyRound className="size-4" />
					<span>Code</span>
				</button>
				<button
					type="button"
					className={`mobile-bottom-tab ${mobileTab === "add" ? "mobile-bottom-tab-active" : ""}`}
					onClick={() => setMobileTab("add")}
				>
					<Plus className="size-4" />
					<span>Add</span>
				</button>
			</nav>
		</main>
	);
}
