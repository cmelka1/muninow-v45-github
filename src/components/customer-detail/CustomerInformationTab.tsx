import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, MapPin, Phone, Globe } from 'lucide-react';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  entity_type: string;
  ownership_type: string;
  tax_id: string;
  entity_phone: string;
  entity_website: string;
  entity_description: string;
  business_address_line1: string;
  business_address_line2?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  incorporation_date?: any;
  created_at: string;
  status: string;
}

interface CustomerInformationTabProps {
  customer: Customer;
}

const CustomerInformationTab: React.FC<CustomerInformationTabProps> = ({ customer }) => {
  const formatIncorporationDate = (dateObj: any) => {
    if (!dateObj || typeof dateObj !== 'object') return 'Not provided';
    const { month, day, year } = dateObj;
    if (!month || !day || !year) return 'Not provided';
    return `${month}/${day}/${year}`;
  };

  const formatAddress = (customer: Customer) => {
    const parts = [
      customer.business_address_line1,
      customer.business_address_line2,
      `${customer.business_city}, ${customer.business_state} ${customer.business_zip_code}`,
      customer.business_country
    ].filter(Boolean);
    return parts.join('\n');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Entity Information */}
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Entity Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-700 font-medium text-sm">Legal Entity Name</label>
            <p className="text-slate-900 mt-1">{customer.legal_entity_name}</p>
          </div>
          
          <div>
            <label className="text-slate-700 font-medium text-sm">Doing Business As</label>
            <p className="text-slate-900 mt-1">{customer.doing_business_as}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-700 font-medium text-sm">Entity Type</label>
              <p className="text-slate-900 mt-1">{customer.entity_type}</p>
            </div>
            <div>
              <label className="text-slate-700 font-medium text-sm">Ownership Type</label>
              <p className="text-slate-900 mt-1">{customer.ownership_type}</p>
            </div>
          </div>
          
          <div>
            <label className="text-slate-700 font-medium text-sm">Tax ID</label>
            <p className="text-slate-900 mt-1 font-mono">{customer.tax_id}</p>
          </div>
          
          <div>
            <label className="text-slate-700 font-medium text-sm">Description</label>
            <p className="text-slate-900 mt-1">{customer.entity_description}</p>
          </div>
          
          <div>
            <label className="text-slate-700 font-medium text-sm">Incorporation Date</label>
            <p className="text-slate-900 mt-1">{formatIncorporationDate(customer.incorporation_date)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Address */}
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Business Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-700 font-medium text-sm">Address</label>
            <div className="text-slate-900 mt-1 whitespace-pre-line">
              {formatAddress(customer)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-700 font-medium text-sm">Phone</label>
            <p className="text-slate-900 mt-1">{customer.entity_phone}</p>
          </div>
          
          {customer.entity_website && (
            <div>
              <label className="text-slate-700 font-medium text-sm">Website</label>
              <div className="mt-1">
                <a 
                  href={customer.entity_website.startsWith('http') ? customer.entity_website : `https://${customer.entity_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Globe className="h-4 w-4" />
                  {customer.entity_website}
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerInformationTab;