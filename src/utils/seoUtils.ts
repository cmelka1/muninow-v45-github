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
    "logo": "https://muninow.com/favicon.ico",
    "description": "Simplified municipal bill pay platform for residents, businesses, and municipalities",
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
      title: "MuniNow - Simplified Municipal Bill Pay Platform",
      description: "Pay all your municipal bills in one place. Secure, easy-to-use platform for residents, businesses, and municipalities. Schedule automatic payments and never miss a due date.",
      keywords: "municipal bill pay, city bills, utility payments, autopay, bill management, local government payments, online bill pay, municipal services",
      canonical: "https://muninow.com/"
    },
    features: {
      title: "MuniNow Features - Complete Municipal Payment Solution",
      description: "Explore MuniNow's powerful features including secure payments, automated reminders, detailed analytics, and seamless municipal integrations for enhanced efficiency.",
      keywords: "muninow features, municipal payment features, secure payments, bill automation, payment analytics, municipal software, payment processing",
      canonical: "https://muninow.com/features"
    },
    municipalities: {
      title: "MuniNow for Municipalities - Streamline Municipal Bill Collection",
      description: "Comprehensive platform for municipalities to modernize payment processes, reduce administrative overhead, and improve resident satisfaction with automated billing and reconciliation.",
      keywords: "municipal bill collection, municipal payment processing, government billing software, municipal administration, automated billing, payment reconciliation",
      canonical: "https://muninow.com/municipalities"
    },
    residents: {
      title: "MuniNow for Residents - Easy Municipal Bill Pay",
      description: "Residents can pay all municipal bills in one place. View water, electric, gas, tax, and other city bills on a single dashboard. Set up autopay and never miss a payment.",
      keywords: "resident bill pay, municipal bills for residents, city bill payment, water bill pay, electric bill pay, property tax payment",
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
    }
  };

  return metadata[page] || metadata.home;
};