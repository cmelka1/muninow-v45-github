import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageLayout from '@/components/layouts/PageLayout';
import TeamMemberCard from '@/components/TeamMemberCard';
import { getPageMetadata, generateOrganizationStructuredData } from '@/utils/seoUtils';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  initials: string;
}

const teamMembers: TeamMember[] = [
  {
    id: '0',
    name: 'Charles Melka',
    role: 'Co-Founder',
    bio: 'Charles brings seven years of experience evaluating & investing in technology and payments companies',
    imageUrl: '/lovable-uploads/c58569d2-964f-489e-b48e-8e9f174604c1.png',
    initials: 'CM'
  }, 
  {
    id: '5',
    name: 'Bewley Wales',
    role: 'Co-Founder',
    bio: 'Bewley has extensive experience building & implementing technology systems for investors and real estate brokers',
    imageUrl: '/lovable-uploads/04d4f4dd-70e2-45d5-bed5-5d099daa6c48.png',
    initials: 'BW'
  }
];

const About: React.FC = () => {
  const metadata = getPageMetadata('about');
  const organizationData = generateOrganizationStructuredData();
  const breadcrumbs = [
    { name: "Home", url: "https://muninow.com/" },
    { name: "About", url: "https://muninow.com/about" }
  ];

  // Track locally uploaded images - now initializing from localStorage if available
  const [localImages, setLocalImages] = useState<Record<string, string>>(() => {
    const savedImages = localStorage.getItem('teamMemberImages');
    return savedImages ? JSON.parse(savedImages) : {};
  });

  // Save images to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('teamMemberImages', JSON.stringify(localImages));
  }, [localImages]);

  const handleImageUpload = (memberId: string, imageDataUrl: string) => {
    setLocalImages(prev => ({
      ...prev,
      [memberId]: imageDataUrl
    }));
  };

  return (
    <PageLayout
      title={metadata.title.replace(' - MuniNow', '')}
      description={metadata.description}
      keywords={metadata.keywords}
      canonical={metadata.canonical}
      structuredData={organizationData}
      breadcrumbs={breadcrumbs}
    >
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">About MuniNow</h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Simplifying Municipal Operations
              </p>
            </div>
          </section>

          {/* About Content */}
          <section className="py-8 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="space-y-6 text-muted-foreground">
                <p className="text-lg">
                  MuniNow was created to empower municipalities with modern, intuitive technology. Our platform seamlessly connects existing IT systems, streamlining data reconciliation and simplifying resident and business payments.
                </p>
                
                <p className="text-lg">
                  We understand the challenges cities and towns face with outdated processes and disconnected systems. MuniNow eliminates manual, duplicative work by automating the flow of information between departments, enhancing operational efficiency and service delivery.
                </p>
                
                <p className="text-lg">
                  Designed specifically for the unique needs of local governments, MuniNow accelerates revenue collection, reduces administrative burden, and improves community engagement.
                </p>
                
                <p className="text-lg">
                  We are committed to helping municipalities deliver better service experiences with technology that is easy to deploy, integrate, and scale.
                </p>
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="py-16 bg-muted px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                To modernize local government operations by connecting critical systems and simplifying payments, enabling municipalities to better serve their communities.
              </p>
            </div>
          </section>

          {/* Team Section */}
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Our Team</h2>
                <p className="text-muted-foreground max-w-3xl mx-auto">
                  Meet the experienced professionals dedicated to transforming municipal payment systems
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {teamMembers.map(member => (
                  <TeamMemberCard
                    key={member.id}
                    id={member.id}
                    name={member.name}
                    role={member.role}
                    bio={member.bio}
                    imageUrl={member.imageUrl || localImages[member.id] || null}
                    initials={member.initials}
                    onImageUpload={handleImageUpload}
                    allowImageUpload={false} /* Set to false to disable image uploads */
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="py-16 px-4 text-center bg-muted">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-3xl font-bold mb-8">Learn More</h2>
              <Link to="/contact">
                <Button size="lg" className="group">
                  Contact Us
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
};

export default About;