import { SEOMetadata } from '@/types';

export const generateFAQStructuredData = (faqs: Array<{question: string, answer: string}>) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

export const generateOrganizationStructuredData = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MuniNow",
    "url": "https://muninow.com",
    "logo": "https://qcuiuubbaozncmejzvxje.supabase.co/storage/v1/object/public/muninow-icon/MuniNow_Icon_Blue.png",
    "description": "MuniNow simplifies local government payments with a fast, secure, and unified platform",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-800-MUNINOW",
      "contactType": "customer service",
      "availableLanguage": "English"
    },
    "sameAs": [
      "https://twitter.com/muninow",
      "https://linkedin.com/company/muninow"
    ]
  };
};

export const getPageMetadata = (page: string): SEOMetadata => {
  const metadata: Record<string, SEOMetadata> = {
    home: {
      title: "MuniNow – Streamlining Municipal Payments",
      description: "MuniNow simplifies local government payments with a fast, secure, and unified platform",
      keywords: "municipal payments, city services, permits, licenses, taxes, local government payments, online municipal services, municipal management, payment automation",
      canonical: "https://muninow.com/"
    },
    features: {
      title: "MuniNow Features - Complete Municipal Payment Solution",
      description: "Explore MuniNow's powerful features including secure payments, automated reminders, detailed analytics, and seamless municipal integrations for enhanced efficiency.",
      keywords: "muninow features, municipal payment features, secure payments, payment automation, payment analytics, municipal software, payment processing",
      canonical: "https://muninow.com/features"
    },
    municipalities: {
      title: "MuniNow for Municipalities - Streamline Municipal Services",
      description: "Comprehensive platform for municipalities to modernize payment processes, reduce administrative overhead, and improve resident satisfaction with automated service management and reconciliation.",
      keywords: "municipal services, municipal payment processing, government services software, municipal administration, automated services, payment reconciliation",
      canonical: "https://muninow.com/municipalities"
    },
    residents: {
      title: "MuniNow for Residents - Easy Municipal Services",
      description: "Residents can access all municipal services in one place. Manage permits, licenses, taxes, and payments on a single dashboard. Set up autopay and never miss a payment.",
      keywords: "resident services, municipal services for residents, city services, permits, licenses, property tax payment, municipal payments",
      canonical: "https://muninow.com/residents"
    },
    about: {
      title: "About MuniNow - Simplifying Municipal Operations",
      description: "Learn about MuniNow's mission to modernize local government operations by connecting critical systems and simplifying payments for municipalities and residents.",
      keywords: "about muninow, municipal technology, local government software, payment platform, municipal operations, city technology",
      canonical: "https://muninow.com/about"
    },
    privacy: {
      title: "Privacy Policy - MuniNow",
      description: "Learn how MuniNow protects your privacy and handles your personal information. Our comprehensive privacy policy covers payment processing, data security, and your privacy rights.",
      keywords: "privacy policy, data protection, payment security, PCI compliance, financial data privacy, municipal payment privacy",
      canonical: "https://muninow.com/privacy"
    },
    contact: {
      title: "Contact MuniNow - Get in Touch",
      description: "Contact MuniNow for questions about our municipal payment platform. Reach out for support, partnerships, or to learn more about our services.",
      keywords: "contact muninow, municipal payment support, customer service, partnerships, get in touch",
      canonical: "https://muninow.com/contact"
    },
    terms: {
      title: "Terms of Service - MuniNow",
      description: "Read MuniNow's Terms of Service covering payment processing, user responsibilities, compliance, and legal provisions for our municipal payment platform.",
      keywords: "terms of service, user agreement, payment terms, legal terms, municipal payment terms, service agreement",
      canonical: "https://muninow.com/terms"
    },
    cookies: {
      title: "Cookies Policy - MuniNow",
      description: "Learn about MuniNow's use of cookies, your privacy choices, and how we protect your data. Manage your cookie preferences and understand our compliance with GDPR and CCPA.",
      keywords: "cookies policy, privacy choices, GDPR compliance, CCPA compliance, data protection, cookie preferences, web tracking",
      canonical: "https://muninow.com/cookies"
    },
    accessibility: {
      title: "Accessibility Statement - MuniNow",
      description: "MuniNow's commitment to digital accessibility, WCAG 2.2 compliance, and inclusive design for all users. Learn about our accessibility features, compliance standards, and feedback options.",
      keywords: "accessibility statement, WCAG 2.2, ADA compliance, Section 508, assistive technology, inclusive design, digital accessibility, screen reader support",
      canonical: "https://muninow.com/accessibility"
    }
  };

  return metadata[page] || metadata.home;
};