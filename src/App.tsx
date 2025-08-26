
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/components/CookieConsentProvider";
import ScrollToTop from "@/components/navigation/ScrollToTop";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Features from "./pages/Features";
import Municipalities from "./pages/Municipalities";
import Residents from "./pages/Residents";
import About from "./pages/About";
import ContactUs from "./pages/ContactUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiesPolicy from "./pages/CookiesPolicy";
import Accessibility from "./pages/Accessibility";
import NotFound from "./pages/NotFound";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminCustomers from "./pages/SuperAdminCustomers";
import SuperAdminCustomerDetail from "./pages/SuperAdminCustomerDetail";
import SuperAdminMerchantDetail from "./pages/SuperAdminMerchantDetail";
import SuperAdminProfile from "./pages/SuperAdminProfile";
import BillOverview from "./pages/BillOverview";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import PaymentHistory from "./pages/PaymentHistory";
import MunicipalSignup from "./pages/MunicipalSignup";
import MunicipalDashboard from "./pages/MunicipalDashboard";
import MunicipalSearch from "./pages/MunicipalSearch";
import MunicipalMembers from "./pages/MunicipalMembers";
import MunicipalPermits from "./pages/MunicipalPermits";
import MunicipalBusinessLicenses from "./pages/MunicipalBusinessLicenses";
import MunicipalPermitDetail from "./pages/MunicipalPermitDetail";
import MunicipalMerchants from "./pages/MunicipalMerchants";
import MunicipalMerchantDetail from "./pages/MunicipalMerchantDetail";
import MunicipalProfile from "./pages/MunicipalProfile";
import MunicipalUserDetail from "./pages/MunicipalUserDetail";
import MunicipalTaxes from "./pages/MunicipalTaxes";
import MunicipalOtherServices from "./pages/MunicipalOtherServices";
import MunicipalBillOverview from "./pages/MunicipalBillOverview";
import Permits from "./pages/Permits";
import BusinessLicenses from "./pages/BusinessLicenses";
import { BusinessLicenseDetail } from "./pages/BusinessLicenseDetail";
import Taxes from "./pages/Taxes";
import OtherServices from "./pages/OtherServices";
import PermitOverview from "./pages/PermitOverview";
import PermitDetail from "./pages/PermitDetail";
import PermitCertificate from "./pages/PermitCertificate";
import Notifications from "./pages/Notifications";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MunicipalProtectedRoute } from "@/components/MunicipalProtectedRoute";
import { MunicipalLayout } from "@/components/layouts/MunicipalLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <CookieConsentProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/signin" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/notifications" element={
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 overflow-auto">
                        <Notifications />
                      </main>
                    </div>
                  </SidebarProvider>
                } />
                <Route path="/payment-history" element={<PaymentHistory />} />
                <Route path="/permits" element={<Permits />} />
                <Route path="/business-licenses" element={<BusinessLicenses />} />
                <Route path="/business-license/:id" element={
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 overflow-auto">
                        <BusinessLicenseDetail />
                      </main>
                    </div>
                  </SidebarProvider>
                } />
                <Route path="/taxes" element={<Taxes />} />
                <Route path="/other-services" element={<OtherServices />} />
                <Route path="/permit/:permitId" element={
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 overflow-auto">
                        <PermitDetail />
                      </main>
                    </div>
                  </SidebarProvider>
                } />
                <Route path="/permit/:permitId/certificate" element={
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 overflow-auto">
                        <PermitCertificate />
                      </main>
                    </div>
                  </SidebarProvider>
                } />
                <Route path="/bill/:billId" element={<BillOverview />} />
                <Route path="/payment-confirmation/:paymentHistoryId" element={<PaymentConfirmation />} />
                <Route path="/members" element={<Members />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/features" element={<Features />} />
                <Route path="/municipalities" element={<Municipalities />} />
                <Route path="/residents" element={<Residents />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/cookies" element={<CookiesPolicy />} />
                <Route path="/accessibility" element={<Accessibility />} />
                <Route path="/superadmin/dashboard" element={
                  <ProtectedRoute requiredRole="superAdmin">
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/superadmin/profile" element={
                  <ProtectedRoute requiredRole="superAdmin">
                    <SuperAdminProfile />
                  </ProtectedRoute>
                } />
                <Route path="/superadmin/notifications" element={
                  <ProtectedRoute requiredRole="superAdmin">
                    <Notifications />
                  </ProtectedRoute>
                } />
                <Route path="/superadmin/customers" element={
                  <ProtectedRoute requiredRole="superAdmin">
                    <SuperAdminCustomers />
                  </ProtectedRoute>
                } />
                <Route path="/superadmin/customers/:customerId" element={
                  <ProtectedRoute requiredRole="superAdmin">
                    <SuperAdminCustomerDetail />
                  </ProtectedRoute>
                } />
                <Route path="/superadmin/customers/:customerId/merchants/:merchantId" element={
                  <ProtectedRoute requiredRole="superAdmin">
                    <SuperAdminMerchantDetail />
                  </ProtectedRoute>
                } />
                <Route path="/municipal/signup" element={<MunicipalSignup />} />
                <Route path="/municipal/dashboard" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalDashboard />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/search" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalSearch />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/search/user/:userId" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalUserDetail />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/taxes" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalTaxes />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/permits" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalPermits />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/business-licenses" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalBusinessLicenses />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/permit/:permitId" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalPermitDetail />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/business-license/:id" element={
                  <MunicipalProtectedRoute>
                    <BusinessLicenseDetail />
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/members" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalMembers />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/merchants" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalMerchants />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/merchants/:merchantId" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalMerchantDetail />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/profile" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalProfile />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/notifications" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <Notifications />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/other-services" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalOtherServices />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="/municipal/bill/:billId" element={
                  <MunicipalProtectedRoute>
                    <MunicipalLayout>
                      <MunicipalBillOverview />
                    </MunicipalLayout>
                  </MunicipalProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CookieConsentProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
