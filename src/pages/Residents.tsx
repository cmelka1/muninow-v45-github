import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from 'react-router-dom';
import PageLayout from '@/components/layouts/PageLayout';
import { getPageMetadata, generateFAQStructuredData } from '@/utils/seoUtils';

const Residents = () => {
  const location = useLocation();
  const faqRef = useRef<HTMLElement>(null);
  const metadata = getPageMetadata('residents');
  
  // FAQ data for structured data
  const faqs = [
    {
      question: "How do I access my municipal services through MuniNow?",
      answer: "Simply create an account, add your address, and we'll automatically find your municipal services. You can then view and manage permits, licenses, taxes, and payments in one convenient place."
    },
    {
      question: "How secure are my payment details?",
      answer: "We take security very seriously. MuniNow employs bank-level encryption and security protocols. We never store your full payment details on our servers, and all transactions are processed through PCI-compliant payment processors."
    },
    {
      question: "What if my municipality isn't part of MuniNow yet?",
      answer: "You can still create an account and we'll notify you when your municipality joins the platform. Additionally, you can recommend MuniNow to your local government officials through our referral program."
    },
    {
      question: "Can I set up automatic payments?",
      answer: "Yes! MuniNow allows you to set up automatic payments for eligible municipal services. You can choose to pay the full amount when due or set up installment plans where available."
    }
  ];

  const faqStructuredData = generateFAQStructuredData(faqs);
  
  // Effect to handle hash navigation and smooth scrolling to sections
  useEffect(() => {
    // Check if there's a hash in the URL
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      
      if (element) {
        // Wait a moment for the page to render fully
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);
  
  return (
    <PageLayout
      title={metadata.title.replace(' - MuniNow', '')}
      description={metadata.description}
    >
      <div className="min-h-screen flex flex-col">
        <main id="main-content" className="flex-grow">
          {/* Hero Section */}
          <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  The Easiest Way to Access Municipal Services
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  One simple dashboard for all your city services. Manage permits, licenses, taxes, and payments in one place.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/signup">
                    <Button size="lg" className="text-base">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="text-base">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section id="faq" ref={faqRef} className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index + 1}`}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
};

export default Residents;