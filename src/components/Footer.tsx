import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-secondary">
              The private atelier for couture intelligence — where thought becomes
              fabric, and vision becomes an archive.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm text-secondary">
            <Link to="/studio" className="transition-colors duration-200 hover:text-primary">
              Studio
            </Link>
            <Link to="/atelier" className="transition-colors duration-200 hover:text-primary">
              Atelier
            </Link>
            <Link to="/auth" className="transition-colors duration-200 hover:text-primary">
              Sign in
            </Link>
          </nav>
        </div>
        <hr className="hairline my-8" />
        <div className="flex flex-col items-start justify-between gap-2 text-xs text-secondary/80 sm:flex-row">
          <p>© {new Date().getFullYear()} EL ATELIER — Couture Intelligence.</p>
          <p>Fait avec précision.</p>
        </div>
      </div>
    </footer>
  );
}
