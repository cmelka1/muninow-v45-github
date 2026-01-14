import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from '@/components/layouts/PageLayout';
import { getPageMetadata } from '@/utils/seoUtils';

const ContactUs: React.FC = () => {
  const metadata = getPageMetadata('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    message: ''
  });


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log("Submitting contact form...");
      // Call the edge function to send the email
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          ...formData
        }
      });
      
      console.log("Response:", { data, error });
      
      if (error) {
        throw new Error(error.message || "Failed to send message");
      }
      
      // Show success message
      toast({
        title: "Message Sent",
        description: data?.note || "Thank you for your message. We'll get back to you soon.",
      });
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        organization: '',
        message: ''
      });

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { name: "Home", url: "https://muninow.com/" },
    { name: "Contact", url: "https://muninow.com/contact" }
  ];

  return (
    <PageLayout
      title={metadata.title.replace(' - MuniNow', '')}
      description={metadata.description}
      keywords={metadata.keywords}
      canonical={metadata.canonical}
      breadcrumbs={breadcrumbs}
    >
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <section className="bg-gradient-to-b from-primary/10 to-background py-8 md:py-12">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Contact Us</h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Questions about MuniNow? Our team is ready to help with your municipal payment solution needs.
              </p>
            </div>
          </section>

          <section className="py-8 px-4">
            <div className="container mx-auto max-w-2xl">
              <Card>
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                  <CardDescription>
                    We'll respond to your inquiry as quickly as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          placeholder="Enter your first name" 
                          className="mt-1" 
                          value={formData.firstName}
                          onChange={handleChange}
                          required 
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Enter your last name" 
                          className="mt-1" 
                          value={formData.lastName}
                          onChange={handleChange}
                          required 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Enter your email address" 
                        className="mt-1" 
                        value={formData.email}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="organization">Municipality/Organization</Label>
                      <Input 
                        id="organization" 
                        placeholder="Enter your organization name" 
                        className="mt-1" 
                        value={formData.organization}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us how we can help you..." 
                        rows={4} 
                        className="mt-1" 
                        value={formData.message}
                        onChange={handleChange}
                      />
                    </div>
                    


                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                      {isSubmitting ? 
                        "Sending..." : 
                        <>Send Message <Send className="ml-2 h-4 w-4" /></>
                      }
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
};

export default ContactUs;