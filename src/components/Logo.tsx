import { Link } from "react-router-dom";

interface LogoProps {
  to?: string;
  className?: string;
}

export default function Logo({ to = "/", className = "" }: LogoProps) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2.5 select-none ${className}`}
      aria-label="EL ATELIER — home"
    >
      <span
        aria-hidden="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 transition-all duration-300 group-hover:border-primary"
      >
        <span className="font-heading text-lg font-semibold leading-none tracking-tight text-primary">
          EA
        </span>
        <span className="absolute inset-0 rounded-full border border-flamingo/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-semibold uppercase tracking-[0.28em] text-primary">
          El Atelier
        </span>
        <span className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.32em] text-secondary/70">
          Couture Intelligence
        </span>
      </span>
    </Link>
  );
}
