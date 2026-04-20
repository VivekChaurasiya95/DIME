import { NextResponse } from "next/server";

import { getSimilarity } from "@/lib/analysis/similarity";

export async function GET(): Promise<Response> {
	try {
		const result = getSimilarity("AI chatbot for students");
		return NextResponse.json(result, { status: 200 });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Failed to compute similarity";

		return NextResponse.json(
			{
				error: message,
			},
			{ status: 500 },
		);
	}
}
