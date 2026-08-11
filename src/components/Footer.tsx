import { Github, Linkedin, Instagram } from "lucide-react";

const socials = [
  {
    label: "GitHub",
    href: "https://github.com/Tafseer0",
    icon: Github,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/tafseeralam/",
    icon: Linkedin,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/tafseer.ai/",
    icon: Instagram,
  },
];

export function Footer() {
  return (
    <footer className="footer-bar">
      <span className="footer-copy">
        Built with <span className="footer-heart">♥</span> for data analysts
      </span>

      <div className="footer-socials">
        {socials.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="footer-social-link"
          >
            <Icon size={18} strokeWidth={1.7} />
          </a>
        ))}
      </div>

      <span className="footer-rights">
        © 2026 Anomaly Agent. All rights reserved.
      </span>
    </footer>
  );
}
