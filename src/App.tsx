
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
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
