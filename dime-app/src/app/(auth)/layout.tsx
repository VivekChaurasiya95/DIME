import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-[#ea580c] to-[#c2410c] relative overflow-hidden text-white justify-center px-16 xl:px-24">
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        <div className="relative z-10 max-w-lg mb-16">
          <div className="w-40 h-40 bg-white rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl overflow-hidden p-6">
            {/* DIME Logo representation from Image 1 */}
            <svg
              viewBox="0 0 100 100"
              fill="none"
              className="w-full h-full text-[#ea580c]"
            >
              <path d="M20 20 h25 v30 h35 v30 h-60 z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight leading-[1.1]">
            Validate your
            <br />
            software ideas
            <br />
            with data
          </h1>
          <p className="text-orange-100 text-lg md:text-xl leading-relaxed font-medium">
            The intelligence layer for your next big product decision. Join
            10,000+ founders making data-driven choices.
          </p>
        </div>

        {/* Footer Area */}
        <div className="absolute bottom-8 left-16 right-16 flex justify-between text-sm font-medium text-orange-200 z-10">
          <p>© 2026 DIME Technologies Inc.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-[1.2] flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-[#fafafa]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
