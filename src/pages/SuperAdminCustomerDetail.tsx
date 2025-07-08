import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomers } from '@/hooks/useCustomers';
import { ArrowLeft, Building, MapPin, Phone, Globe, Hash } from 'lucide-react';

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

const SuperAdminCustomerDetail = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { fetchCustomerById, isLoading, error } = useCustomers();
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      if (customerId) {
        const customerData = await fetchCustomerById(customerId);
        setCustomer(customerData);
      }
    };
    loadCustomer();
  }, [customerId]);

  const handleBack = () => {
    navigate('/superadmin/customers');
  };

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

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <Card>
            <CardContent className="py-8">
              <p className="text-destructive text-center">
                {error || 'Customer not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {customer.legal_entity_name}
          </h1>
          <p className="text-gray-600">
            Customer Details - {customer.entity_type}
          </p>
        </div>

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

          {/* System Information */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-slate-700 font-medium text-sm">Customer ID</label>
                <p className="text-slate-900 mt-1 font-mono text-sm">{customer.customer_id}</p>
              </div>
              
              <div>
                <label className="text-slate-700 font-medium text-sm">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : customer.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomerDetail;