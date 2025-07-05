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
    }
  };

  return metadata[page] || metadata.home;
};