import React from 'react';

export const StatsSection = () => {
  const stats = [
    {
      value: "10,000+",
      label: "Bills Paid Monthly",
      description: "Residents trust us with their payments"
    },
    {
      value: "500+",
      label: "Municipalities", 
      description: "Across the United States"
    },
    {
      value: "99.9%",
      label: "Uptime",
      description: "Reliable service when you need it"
    },
    {
      value: "4.9/5",
      label: "Customer Rating",
      description: "Based on 2,000+ reviews"
    }
  ];

  return (
    <section className="py-16 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Trusted by Communities Nationwide
          </h2>
          <p className="text-muted-foreground">
            Real numbers from real customers who trust MuniNow with their municipal payments
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};