import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[hsl(var(--background))]/95 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/studio" className="flex items-center gap-2 group">
            <span className="text-xl">
              <span className="font-sans font-medium text-[hsl(var(--foreground))]">
                Godínez
              </span>
              <span className="text-gold">.</span>
              <span
                className="font-serif italic font-bold text-magenta inline-block"
                style={{ transform: "skewX(6deg)" }}
              >
                AI
              </span>
            </span>
          </Link>

          {/* Desktop right section */}
          <div className="hidden md:flex items-center gap-6">
            <SignedIn>
              <Link
                to="/studio"
                className="text-[hsl(var(--foreground))]/50 hover:text-[hsl(var(--foreground))] transition-colors font-medium text-sm relative group"
              >
                Espacios de trabajo
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-magenta transition-all group-hover:w-full" />
              </Link>
              <UserButton
                appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              />
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="text-sm font-semibold text-gold hover:text-gold-light transition-colors"
              >
                Iniciar sesión →
              </Link>
            </SignedOut>
          </div>

          {/* Mobile right section */}
          <div className="flex items-center gap-3 md:hidden">
            <SignedIn>
              <UserButton
                appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              />
            </SignedIn>
            <button
              className="p-2 text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[hsl(var(--background))]/95 backdrop-blur-lg border-t border-white/5 py-3 px-4">
          <SignedIn>
            <Link
              to="/studio"
              className="block py-3 text-[hsl(var(--foreground))]/75 hover:text-magenta transition-colors font-medium border-b border-white/5"
              onClick={() => setIsOpen(false)}
            >
              Espacios de trabajo
            </Link>
          </SignedIn>
          <SignedOut>
            <Link
              to="/sign-in"
              className="block py-3 text-gold hover:text-gold-light transition-colors font-semibold"
              onClick={() => setIsOpen(false)}
            >
              Iniciar sesión →
            </Link>
          </SignedOut>
        </div>
      )}
    </nav>
  );
}
