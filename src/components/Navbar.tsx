import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useSound } from "../lib/sound";
import Logo from "./Logo";

const NAV_ITEMS = [
  { to: "/", label: "La Maison", short: "Maison", end: true },
  { to: "/studio", label: "Studio", short: "Studio" },
  { to: "/novia", label: "LA GRANDE NOVIA™", short: "Novia" },
  { to: "/couture", label: "COUTURE CRÉATION™", short: "Création" },
  { to: "/bijoux", label: "COUTURE BIJOUX™", short: "Bijoux" },
  { to: "/dossier", label: "ATELIER DOSSIER™", short: "Dossier" },
  { to: "/atelier", label: "Atelier", short: "Atelier" },
  { to: "/booklet", label: "Le Livret", short: "Livret" },
  { to: "/billing", label: "Abonnement", short: "Billings" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { soundOn, toggleSound } = useSound();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Logo />

        {/* Desktop links — a fade-masked scroll row so no item is ever cut */}
        <div className="relative hidden flex-1 justify-center lg:block">
          <div className="no-scrollbar flex items-center justify-center gap-0.5 overflow-x-auto px-2 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-2.5 py-2 text-[13px] font-medium tracking-tight whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:bg-muted hover:text-primary"
                  }`
                }
              >
                {item.short}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right cluster: sea sound + auth + mobile menu */}
        <div className="flex items-center gap-1">
          {/* Sea sound toggle */}
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sea sound" : "Play sea sound"}
            title={soundOn ? "Mute sea sound" : "Play sea sound"}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-primary transition-all duration-200 hover:bg-muted active:scale-95"
          >
            {soundOn ? (
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-sm text-secondary xl:block">
                {user.email}
              </span>
              <button onClick={handleSignOut} className="btn-ghost">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn-ghost">
                Sign in
              </Link>
              <Link to="/auth?mode=signup" className="btn-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Enter the Studio
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-200 hover:bg-muted lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className={`overflow-hidden border-b border-border/70 bg-background/95 backdrop-blur-md transition-[max-height,opacity] duration-300 ease-out lg:hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-4 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-base font-medium transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:bg-muted hover:text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
            {user ? (
              <button onClick={handleSignOut} className="btn-ghost justify-start">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <>
                <Link to="/auth" className="btn-secondary">
                  Sign in
                </Link>
                <Link to="/auth?mode=signup" className="btn-primary">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Enter the Studio
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
