import React from 'react';
import { Link } from 'react-router-dom';

export const PreloginFooter = () => {
  const currentYear = new Date().getFullYear();

  const Logo = () => (
    <div className="flex items-center">
      <img 
        src="https://qcuiuubbaozcmejzvxje.supabase.co/storage/v1/object/public/muninow-logo/MuniNow_Logo_Exploration_Blue.png"
        alt="MuniNow Logo"
        className="h-8 w-auto"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling!.textContent = 'MuniNow';
        }}
      />
      <span className="text-xl font-bold text-primary ml-2" style={{ display: 'none' }}></span>
    </div>
  );

  const socialLinks = [
    { 
      name: 'Facebook', 
      imageUrl: 'https://qcuiuubbaozcmejzvxje.supabase.co/storage/v1/object/public/social-media-logos/Facebook_Logo_Primary.png',
      href: '#' 
    },
    { 
      name: 'X', 
      imageUrl: 'https://qcuiuubbaozcmejzvxje.supabase.co/storage/v1/object/public/social-media-logos/X-logo-black.png',
      href: '#' 
    },
    { 
      name: 'LinkedIn', 
      imageUrl: 'https://qcuiuubbaozcmejzvxje.supabase.co/storage/v1/object/public/social-media-logos/LinkedIn_logo_initials.png',
      href: '#' 
    },
  ];

  return (
    <footer className="bg-muted border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-xs">
              Municipal Payment Portal - Pay your municipal bills quickly and securely online.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={social.name}
                >
                  <img 
                    src={social.imageUrl}
                    alt={social.name}
                    className="h-5 w-5 filter grayscale brightness-75 hover:grayscale-0 hover:brightness-100 transition-all duration-200"
                  />
                </a>
              ))}
            </div>
          </div>

          {/* For Residents */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">For Residents</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/signin"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Pay My Bill
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Create Account
                </Link>
              </li>
              <li>
                <a
                  href="/#how-it-works"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <Link
                  to="/residents#faq"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* For Municipalities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">For Municipalities</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/municipal-login"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Municipal Login
                </Link>
              </li>
              <li>
                <Link
                  to="/municipal-signup"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Municipal Sign Up
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/integration"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Integration Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/accessibility"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-muted-foreground">
              © {currentYear} MuniNow. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center md:justify-end space-x-6">
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/cookies"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Cookies
              </Link>
              <Link
                to="/accessibility"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};