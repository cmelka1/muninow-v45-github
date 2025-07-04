import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PaymentHistory = () => {
  const { user, profile } = useAuth();

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">MuniNow</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment History</h2>
          <p className="text-gray-600">
            View your payment history and transaction details.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$259.25</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">2</div>
              <p className="text-xs text-muted-foreground">
                Transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">1</div>
              <p className="text-xs text-muted-foreground">
                Transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
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
    </div>
  );
};

export default PaymentHistory;