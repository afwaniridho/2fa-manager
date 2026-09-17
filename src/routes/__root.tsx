import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import "../styles.css";

const siteUrl = "https://2fa-manager.ridhoafwani.dev";
const title = "2FA Manager | Browser TOTP authenticator";
const description =
	"Generate two-factor authentication codes in your browser. Add TOTP accounts, copy codes, and import or export JSON backups. No sign-up required.";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				title,
			},
			{
				name: "description",
				content: description,
			},
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "2FA Manager" },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: `${siteUrl}/` },
			{ property: "og:image", content: `${siteUrl}/preview.png` },
			{
				property: "og:image:alt",
				content: "2FA Manager with example accounts and a TOTP code countdown",
			},
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: `${siteUrl}/preview.png` },
			{
				name: "theme-color",
				content: "#FAF9F5",
			},
		],
		links: [
			{ rel: "canonical", href: `${siteUrl}/` },
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
