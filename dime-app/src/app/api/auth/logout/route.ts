import { NextResponse } from "next/server";
import { auth, signOut } from "../../../../../auth";

/**
 * POST /api/auth/logout
 *
 * Server-side logout endpoint that invalidates the session via next-auth's
 * signOut helper. Returns a JSON confirmation rather than redirecting,
 * so the client can handle navigation (e.g. redirect to /login).
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: true, message: "No active session" });
    }

    // Perform server-side sign-out (clears the JWT / session cookie)
    await signOut({ redirect: false });

    return NextResponse.json({ success: true, message: "Signed out" });
  } catch (error: unknown) {
    console.error("AUTH_LOGOUT_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
