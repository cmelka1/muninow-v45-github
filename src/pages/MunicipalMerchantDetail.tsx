import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Phone, Globe, CreditCard } from 'lucide-react';
import { useMerchants } from '@/hooks/useMerchants';

const MunicipalMerchantDetail = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  
  const { fetchMerchantById, isLoading, error } = useMerchants();
  const [merchant, setMerchant] = React.useState<any>(null);

  React.useEffect(() => {
    const loadMerchant = async () => {
      if (!merchantId) {
        console.log('No merchantId provided');
        return;
      }
      
      console.log('Loading merchant with ID:', merchantId);
      
      try {
        const result = await fetchMerchantById(merchantId);
        console.log('Received merchant result:', result);
        setMerchant(result);
      } catch (err) {
        console.error('Error loading merchant:', err);
      }
    };

    loadMerchant();
  }, [merchantId, fetchMerchantById]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-24"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/municipal/merchants')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Merchants
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Merchant not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'N/A';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Format as (xxx) xxx-xxxx
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // Return original if not 10 digits
    return phone;
  };

  const formatAddress = (merchant: any) => {
    const parts = [
      merchant.business_address_line1,
      merchant.business_address_line2,
      merchant.business_address_city,
      merchant.business_address_state,
      merchant.business_address_zip_code,
      merchant.business_address_country
    ].filter(Boolean);
    return parts.join(', ') || 'No address provided';
  };

  const maskRoutingNumber = (routingNumber: string | null) => {
    if (!routingNumber) return 'Not provided';
    // Show first 2 and last 2 digits, mask the middle
    if (routingNumber.length >= 4) {
      const first2 = routingNumber.slice(0, 2);
      const last2 = routingNumber.slice(-2);
      const middleLength = routingNumber.length - 4;
      const masked = '•'.repeat(middleLength);
      return `${first2}${masked}${last2}`;
    }
    return routingNumber;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/municipal/merchants')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Merchants
          </Button>
          <h1 className="text-2xl font-bold">Merchant Details</h1>
        </div>

        {/* Basic Merchant Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Merchant Name</label>
                <p className="text-base">{merchant.merchant_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">DBA (Doing Business As)</label>
                <p className="text-base">{merchant.doing_business_as || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-base">{merchant.category || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
                <p className="text-base">{merchant.subcategory || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MCC Code</label>
                <p className="text-base">{merchant.mcc_code || 'Not provided'}</p>
              </div>
              {merchant.business_website && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Website</label>
                  <p className="text-base">
                    <a 
                      href={merchant.business_website.startsWith('http') ? merchant.business_website : `https://${merchant.business_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      {merchant.business_website}
                    </a>
                  </p>
                </div>
              )}
            </div>
            {merchant.business_description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Description</label>
                <p className="text-base">{merchant.business_description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Address Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Business Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-base">{formatAddress(merchant)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Phone</label>
                <p className="text-base flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {formatPhoneNumber(merchant.business_phone)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Holder Name</label>
                <p className="text-base">{merchant.bank_account_holder_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                <p className="text-base">{merchant.bank_account_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Routing Number</label>
                <p className="text-base font-mono">{maskRoutingNumber(merchant.bank_routing_number)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                <p className="text-base font-mono">{merchant.bank_masked_account_number || 'Not provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default MunicipalMerchantDetail;