"use client";

import { motion } from "framer-motion";
import {
  MessageCircle,
  Instagram,
  Youtube,
  Music2,
  MapPin,
  Mail,
  Phone,
  Heart,
  Mic2,
} from "lucide-react";

const SOCIAL_LINKS = [
  {
    name: "WhatsApp",
    href: "https://wa.me/6287880307711",
    icon: <MessageCircle className="h-5 w-5" />,
    color: "hover:bg-green-500/20 hover:text-green-400",
  },
  {
    name: "Instagram",
    href: "https://instagram.com/standupindo_bks",
    icon: <Instagram className="h-5 w-5" />,
    color: "hover:bg-pink-500/20 hover:text-pink-400",
  },
  {
    name: "YouTube",
    href: "https://youtube.com/@standupindo_bks",
    icon: <Youtube className="h-5 w-5" />,
    color: "hover:bg-red-500/20 hover:text-red-400",
  },
  {
    name: "TikTok",
    href: "https://tiktok.com/@standupindo_bks",
    icon: <Music2 className="h-5 w-5" />,
    color: "hover:bg-white/20 hover:text-white",
  },
];

const QUICK_LINKS = [
  { name: "Events", href: "#events" },
  { name: "Performers", href: "#performers" },
  { name: "Venues", href: "#venues" },
  { name: "Pricing", href: "#pricing" },
];

export const FooterSection = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="relative overflow-hidden bg-sun6bks-dark">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-sun6bks-gold to-sun6bks-orange p-2">
                <Mic2 className="h-6 w-6 text-sun6bks-dark" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Standupindo Bekasi Events
                </h3>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-400">
              Komunitas Standupindo Bekasi. Cek-cek event terbaru Standupindo
              Bekasi disini.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`rounded-full bg-white/5 p-3 text-gray-400 transition-all ${social.color}`}
                  title={social.name}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="mb-4 font-semibold text-white">Quick Links</h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-sun6bks-gold"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="mb-4 font-semibold text-white">Kontak</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sun6bks-gold" />
                <span>Bekasi, Jawa Barat</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-sun6bks-gold" />
                <span>+62 878-8030-7711</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-sun6bks-gold" />
                <span>prideofbekasi@gmail.com</span>
              </li>
            </ul>
          </motion.div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="mb-4 font-semibold text-white">Newsletter</h4>
            <p className="mb-4 text-sm text-gray-400">
              Dapatkan info event terbaru langsung ke emailmu!
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Email kamu..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-sun6bks-gold/50"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-lg bg-sun6bks-gold px-4 py-2 text-sm font-semibold text-sun6bks-dark transition-colors hover:bg-sun6bks-orange"
              >
                Subscribe
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-gray-500 md:flex-row"
        >
          <p>© {currentYear} Standupindo Bekasi Events. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-4 w-4 text-red-500" /> di Bekasi
          </p>
        </motion.div>
      </div>

      {/* Fixed WhatsApp Button */}
      <motion.a
        href="https://wa.me/6287880307711"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/25 transition-shadow hover:shadow-green-500/40"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.a>
    </footer>
  );
};
