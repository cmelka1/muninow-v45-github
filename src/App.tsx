
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/SimpleAuthContext";
import { CookieConsentProvider } from "@/components/CookieConsentProvider";
import ScrollToTop from "@/components/navigation/ScrollToTop";
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
import MunicipalSettings from "./pages/MunicipalSettings";
import MunicipalUserDetail from "./pages/MunicipalUserDetail";
import MunicipalTaxes from "./pages/MunicipalTaxes";
import MunicipalTaxDetail from "./pages/MunicipalTaxDetail";
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
import BusinessLicenseCertificate from "./pages/BusinessLicenseCertificate";
import TaxDetail from "./pages/TaxDetail";
import ServiceApplicationDetail from "@/pages/ServiceApplicationDetail";
import MunicipalServiceApplicationDetail from "@/pages/MunicipalServiceApplicationDetail";
import Notifications from "./pages/Notifications";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import { MunicipalLayout } from "@/components/layouts/MunicipalLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const App = () => (
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
                <Route path="/tax/:submissionId" element={
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
                <Route path="/bill/:billId" element={
                  <SimpleProtectedRoute requireAccountType={["residentadmin", "residentuser", "businessadmin", "businessuser"]}>
                    <BillOverview />
                  </SimpleProtectedRoute>
                } />
                <Route path="/payment-confirmation/:paymentHistoryId" element={
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
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalTaxes />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="/municipal/tax/:submissionId" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
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
          <Route path="/municipal/service-application/:applicationId" element={
            <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
              <MunicipalLayout>
                <MunicipalServiceApplicationDetail />
              </MunicipalLayout>
            </SimpleProtectedRoute>
          } />
                <Route path="/municipal/bill/:billId" element={
                  <SimpleProtectedRoute requireAccountType="municipaladmin" requireCustomerId>
                    <MunicipalLayout>
                      <MunicipalBillOverview />
                    </MunicipalLayout>
                  </SimpleProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CookieConsentProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
);

export default App;
