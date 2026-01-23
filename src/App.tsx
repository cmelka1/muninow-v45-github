
import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/SimpleAuthContext";
import { CookieConsentProvider } from "@/components/CookieConsentProvider";
import ScrollToTop from "@/components/navigation/ScrollToTop";
import { Skeleton } from "@/components/ui/skeleton";

// Static imports for frequently accessed pages
import Index from "./pages/Index";
import Auth from "./pages/SimpleAuth";
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
import Notifications from "./pages/Notifications";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import { MunicipalLayout } from "@/components/layouts/MunicipalLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OfflineProvider } from "@/components/offline/OfflineProvider";

// Lazy-loaded pages (heavy components)
const BusinessLicenseDetail = React.lazy(() => import('./pages/BusinessLicenseDetail').then(m => ({ default: m.BusinessLicenseDetail })));
const ServiceApplicationDetail = React.lazy(() => import('@/pages/ServiceApplicationDetail'));
const MunicipalServiceApplicationDetail = React.lazy(() => import('@/pages/MunicipalServiceApplicationDetail'));
const MunicipalPermitDetail = React.lazy(() => import('./pages/MunicipalPermitDetail'));
const PermitDetail = React.lazy(() => import('./pages/PermitDetail'));
const BusinessLicenseCertificate = React.lazy(() => import('./pages/BusinessLicenseCertificate'));
const PermitCertificate = React.lazy(() => import('./pages/PermitCertificate'));
const MunicipalTaxDetail = React.lazy(() => import('./pages/MunicipalTaxDetail'));
const TaxDetail = React.lazy(() => import('./pages/TaxDetail'));
const PaymentConfirmation = React.lazy(() => import('./pages/PaymentConfirmation'));
const PermitOverview = React.lazy(() => import('./pages/PermitOverview'));
const MunicipalSignup = React.lazy(() => import('./pages/MunicipalSignup'));
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminCustomers = React.lazy(() => import('./pages/SuperAdminCustomers'));
const SuperAdminCustomerDetail = React.lazy(() => import('./pages/SuperAdminCustomerDetail'));
const SuperAdminMerchantDetail = React.lazy(() => import('./pages/SuperAdminMerchantDetail'));
const SuperAdminProfile = React.lazy(() => import('./pages/SuperAdminProfile'));
const PaymentHistory = React.lazy(() => import('./pages/PaymentHistory'));
const MunicipalDashboard = React.lazy(() => import('./pages/MunicipalDashboard'));
const MunicipalSearch = React.lazy(() => import('./pages/MunicipalSearch'));
const MunicipalMembers = React.lazy(() => import('./pages/MunicipalMembers'));
const MunicipalPermits = React.lazy(() => import('./pages/MunicipalPermits'));
const MunicipalBusinessLicenses = React.lazy(() => import('./pages/MunicipalBusinessLicenses'));
const MunicipalMerchants = React.lazy(() => import('./pages/MunicipalMerchants'));
const MunicipalMerchantDetail = React.lazy(() => import('./pages/MunicipalMerchantDetail'));
const MunicipalProfile = React.lazy(() => import('./pages/MunicipalProfile'));
const MunicipalSettings = React.lazy(() => import('./pages/MunicipalSettings'));
const MunicipalUserDetail = React.lazy(() => import('./pages/MunicipalUserDetail'));
const MunicipalTaxes = React.lazy(() => import('./pages/MunicipalTaxes'));
const MunicipalOtherServices = React.lazy(() => import('./pages/MunicipalOtherServices'));
const Permits = React.lazy(() => import('./pages/Permits'));
const BusinessLicenses = React.lazy(() => import('./pages/BusinessLicenses'));
const Taxes = React.lazy(() => import('./pages/Taxes'));
const OtherServices = React.lazy(() => import('./pages/OtherServices'));
const SportReservations = React.lazy(() => import('./pages/SportReservations'));
const MunicipalSportReservations = React.lazy(() => import('./pages/MunicipalSportReservations'));
const MyInspections = React.lazy(() => import('@/pages/MyInspections').then(m => ({ default: m.MyInspections })));
const FormBuilder = React.lazy(() => import('@/pages/admin/FormBuilder').then(m => ({ default: m.FormBuilder })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="space-y-4 text-center">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  </div>
);


const App = () => (
  <HelmetProvider>
    <TooltipProvider>
      <AuthProvider>
        <OfflineProvider>
          <BrowserRouter>
            <ScrollToTop />
            <CookieConsentProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/signin" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* OFFLINE ROUTES */}
                <Route path="/my-inspections" element={
                  <SimpleProtectedRoute requireAccountType={["municipal"]}>
                    <MyInspections />
                  </SimpleProtectedRoute>
                } />
                <Route path="/admin/form-builder" element={
                  <SimpleProtectedRoute requireAccountType={["municipaladmin"]}>
                    <MunicipalLayout>
                       <FormBuilder />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />

                <Route path="/dashboard" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "businessadmin"]}>
                    <Dashboard />
                  </SimpleProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 overflow-auto bg-gray-100">
                        <Notifications />
                      </main>
                    </div>
                  </SidebarProvider>
                } />
                <Route path="/payment-history" element={<PaymentHistory />} />
                <Route path="/permits" element={<Permits />} />
                <Route path="/business-licenses" element={<BusinessLicenses />} />
                <Route path="/business-license/:id" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                          <BusinessLicenseDetail />
                        </main>
                      </div>
                    </SidebarProvider>
                  </SimpleProtectedRoute>
                } />
                <Route path="/business-license/:licenseId/certificate" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                          <BusinessLicenseCertificate />
                        </main>
                      </div>
                    </SidebarProvider>
                  </SimpleProtectedRoute>
                } />
                <Route path="/taxes" element={<Taxes />} />
                <Route path="/tax/:taxId" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                          <TaxDetail />
                        </main>
                      </div>
                    </SidebarProvider>
                  </SimpleProtectedRoute>
                } />
          <Route path="/other-services" element={<OtherServices />} />
          <Route path="/sport-reservations" element={
            <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
              <SportReservations />
            </SimpleProtectedRoute>
          } />
          <Route path="/service-application/:applicationId" element={
            <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
              <SidebarProvider>
                <div className="min-h-screen flex w-full">
                  <AppSidebar />
                  <main className="flex-1 overflow-auto">
                    <ServiceApplicationDetail />
                  </main>
                </div>
              </SidebarProvider>
            </SimpleProtectedRoute>
          } />
                <Route path="/permit/:permitId" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                          <PermitDetail />
                        </main>
                      </div>
                    </SidebarProvider>
                  </SimpleProtectedRoute>
                } />
                <Route path="/permit/:permitId/certificate" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                          <PermitCertificate />
                        </main>
                      </div>
                    </SidebarProvider>
                  </SimpleProtectedRoute>
                } />
                <Route path="/payment-confirmation/:paymentTransactionId" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <PaymentConfirmation />
                  </SimpleProtectedRoute>
                } />
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
                  <SimpleProtectedRoute requireAccountType="superadmin">
                    <SuperAdminDashboard />
                  </SimpleProtectedRoute>
                } />
                <Route path="/superadmin/profile" element={
                  <SimpleProtectedRoute requireAccountType="superadmin">
                    <SuperAdminProfile />
                  </SimpleProtectedRoute>
                } />
                <Route path="/superadmin/notifications" element={
                  <SimpleProtectedRoute requireAccountType="superadmin">
                    <Notifications />
                  </SimpleProtectedRoute>
                } />
                <Route path="/superadmin/customers" element={
                  <SimpleProtectedRoute requireAccountType="superadmin">
                    <SuperAdminCustomers />
                  </SimpleProtectedRoute>
                } />
                <Route path="/superadmin/customers/:customerId" element={
                  <SimpleProtectedRoute requireAccountType="superadmin">
                    <SuperAdminCustomerDetail />
                  </SimpleProtectedRoute>
                } />
                <Route path="/superadmin/customers/:customerId/merchants/:merchantId" element={
                  <SimpleProtectedRoute requireAccountType="superadmin">
                    <SuperAdminMerchantDetail />
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/signup" element={<MunicipalSignup />} />
                <Route path="/municipal/dashboard" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalDashboard />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/search" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalSearch />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/search/user/:userId" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalUserDetail />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/taxes" element={
                  <SimpleProtectedRoute requireAccountType="municipal" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalTaxes />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/tax/:submissionId" element={
                  <SimpleProtectedRoute requireAccountType="municipal" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalTaxDetail />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/permits" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalPermits />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/business-licenses" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalBusinessLicenses />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/permit/:permitId" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalPermitDetail />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/business-license/:id" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <BusinessLicenseDetail />
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/members" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalMembers />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/merchants" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalMerchants />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/merchants/:merchantId" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalMerchantDetail />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/profile" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalProfile />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/municipal-settings" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalSettings />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/notifications" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <Notifications />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
          <Route path="/municipal/other-services" element={
            <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
              <MunicipalLayout>
                <MunicipalOtherServices />
              </MunicipalLayout>
            </SimpleProtectedRoute>
          } />
          <Route path="/municipal/sport-reservations" element={
            <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
              <MunicipalLayout>
                <MunicipalSportReservations />
              </MunicipalLayout>
            </SimpleProtectedRoute>
          } />
          <Route path="/municipal/service-application/:applicationId" element={
            <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
              <MunicipalLayout>
                <MunicipalServiceApplicationDetail />
              </MunicipalLayout>
            </SimpleProtectedRoute>
          } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CookieConsentProvider>
          </BrowserRouter>
        </OfflineProvider>
      </AuthProvider>
    </TooltipProvider>
  </HelmetProvider>
);

export default App;
