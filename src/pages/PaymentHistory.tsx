import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Mock data - will be replaced with real data later
  const payments = [
    {
      id: '1',
      date: '2024-01-15',
      amount: 124.50,
      description: 'Water Bill - January',
      status: 'completed',
      method: 'Credit Card •••• 4242'
    },
    {
      id: '2',
      date: '2024-01-10',
      amount: 89.75,
      description: 'Electric Bill - January',
      status: 'completed',
      method: 'Bank Account •••• 1234'
    },
    {
      id: '3',
      date: '2024-01-05',
      amount: 45.00,
      description: 'Trash Collection - January',
      status: 'failed',
      method: 'Credit Card •••• 4242'
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Payment History</h1>
              <p className="text-gray-600">
                View your payment history and transaction details.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 md:mb-8">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">Total Payments</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">$259.25</div>
                  <p className="text-sm text-gray-600">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">Successful</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-green-600">2</div>
                  <p className="text-sm text-gray-600">
                    Transactions
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-red-600">1</div>
                  <p className="text-sm text-gray-600">
                    Transactions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment History Table */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Transactions</CardTitle>
              </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      payment.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {payment.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{payment.description}</div>
                      <div className="text-sm text-gray-500">
                        {payment.date} • {payment.method}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </div>
                    <div className={`text-sm ${
                      payment.status === 'completed' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {payment.status === 'completed' ? 'Completed' : 'Failed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PaymentHistory;