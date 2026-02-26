"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type NavItem = {
  href: string;
  label: string;
  muted?: boolean;
};

type RoleNavbarProps = {
  title: string;
  badge?: string;
  greeting?: string;
  links: NavItem[];
};

const RoleNavbar = ({ title, badge, greeting, links }: RoleNavbarProps) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleToggleMenu = () => {
    setIsMenuOpen((prevState) => !prevState);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const getLinkClasses = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(`${item.href}/`));

    if (isActive) {
      return "text-sm text-white";
    }

    if (item.muted) {
      return "text-sm text-gray-500 transition-colors hover:text-gray-300";
    }

    return "text-sm text-gray-400 transition-colors hover:text-white";
  };

  return (
    <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-xl">
              {title}{" "}
              {badge ? <span className="text-sun6bks-gold">{badge}</span> : null}
            </h1>
            {greeting ? (
              <p className="mt-1 truncate text-xs text-gray-400 sm:text-sm">
                {greeting}
              </p>
            ) : null}
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className={getLinkClasses(item)}>
                {item.label}
              </Link>
            ))}
            <UserButton afterSignOutUrl="/" />
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-white/10 p-2 text-gray-300 transition-colors hover:bg-white/5 hover:text-white md:hidden"
            aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isMenuOpen}
            onClick={handleToggleMenu}
          >
            {isMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-gray-950/90 p-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 ${getLinkClasses(item)}`}
                  onClick={handleCloseMenu}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-gray-500">Akun</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default RoleNavbar;
