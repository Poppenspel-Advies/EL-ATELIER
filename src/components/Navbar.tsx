import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import Logo from "./Logo";

const NAV_ITEMS = [
  { to: "/studio", label: "Studio" },
  { to: "/atelier", label: "Atelier" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
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

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:bg-muted hover:text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="max-w-[10rem] truncate text-sm text-secondary">
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-200 hover:bg-muted md:hidden"
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
      </nav>

      {/* Mobile menu */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className={`overflow-hidden border-b border-border/70 bg-background/95 backdrop-blur-md transition-[max-height,opacity] duration-300 ease-out md:hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-4 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
