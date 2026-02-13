"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Mic2, Ticket, LogIn, LayoutDashboard, ShieldCheck } from "lucide-react";

const NAV_LINKS = [
  { name: "Events", href: "#events" },
  { name: "Performers", href: "#performers" },
  { name: "Venues", href: "#venues" },
  { name: "Pricing", href: "#pricing" },
];

type NavbarProps = {
  onBuyTicket?: () => void;
  isAdmin?: boolean;
};

export const Navbar = ({ onBuyTicket, isAdmin }: NavbarProps) => {
  const { isSignedIn } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBuyTicket = () => {
    setIsMobileMenuOpen(false);
    if (onBuyTicket) {
      onBuyTicket();
    } else {
      handleNavClick("#events");
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-sun6bks-dark/90 shadow-lg shadow-black/20 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between md:h-20">
            {/* Logo */}
            <motion.a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("#hero");
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <div className="rounded-lg bg-gradient-to-br from-sun6bks-gold to-sun6bks-orange p-2">
                <Mic2 className="h-5 w-5 text-sun6bks-dark" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">SUN 6 BKS</span>
                <span className="ml-2 hidden text-xs text-sun6bks-gold sm:inline">
                  Bekasi
                </span>
              </div>
            </motion.a>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  whileHover={{ y: -2 }}
                  className="text-sm font-medium text-gray-300 transition-colors hover:text-sun6bks-gold"
                >
                  {link.name}
                </motion.a>
              ))}
              <motion.button
                onClick={handleBuyTicket}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-5 py-2 text-sm font-bold text-sun6bks-dark shadow-lg shadow-sun6bks-gold/20"
              >
                <Ticket className="h-4 w-4" />
                Beli Tiket
              </motion.button>

              {/* Auth: Sign In or User Menu */}
              {isSignedIn ? (
                <div className="flex items-center gap-3">
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="flex items-center gap-1.5 text-sm font-medium text-sun6bks-gold transition-colors hover:text-sun6bks-orange"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  ) : (
                    <Link
                      href="/user"
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-300 transition-colors hover:text-sun6bks-gold"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  )}
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-sun6bks-gold/50 hover:text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Masuk
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg bg-white/10 p-2 text-white md:hidden"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-sun6bks-dark/95 backdrop-blur-lg md:hidden"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col gap-4">
                {NAV_LINKS.map((link, index) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-lg font-medium text-gray-300 transition-colors hover:text-sun6bks-gold"
                  >
                    {link.name}
                  </motion.a>
                ))}

                {/* Mobile Auth */}
                {isSignedIn ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-lg font-medium text-sun6bks-orange"
                      >
                        <ShieldCheck className="h-5 w-5" />
                        Admin Panel
                      </Link>
                    ) : (
                      <Link
                        href="/user"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-lg font-medium text-sun6bks-gold"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard Saya
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Link
                      href="/sign-in"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 text-lg font-medium text-gray-300 transition-colors hover:text-sun6bks-gold"
                    >
                      <LogIn className="h-5 w-5" />
                      Masuk
                    </Link>
                  </motion.div>
                )}

                <motion.button
                  onClick={handleBuyTicket}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange py-3 font-bold text-sun6bks-dark"
                >
                  <Ticket className="h-5 w-5" />
                  Beli Tiket
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
