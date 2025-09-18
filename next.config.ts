import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	// Помогаем output file tracing и включаем публичные шрифты
	outputFileTracingRoot: process.cwd(),
	outputFileTracingIncludes: {
		"**/src/app/api/proposals/[id]/pdf/route.ts": [
			"./public/fonts/Inter-Regular.ttf",
			"./public/fonts/Inter-Bold.ttf",
		],
	},
	// Не бандлим pdfkit, оставляем как external
	serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
