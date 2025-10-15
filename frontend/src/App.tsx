// // // frontend/src/App.tsx - UPDATED VERSION WITHOUT AUTHLAYOUT
// // import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// // import { useEffect } from 'react'
// // import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// // import { Toaster } from 'react-hot-toast'
// // import { useAuthStore } from './store/authStore'
// // import DashboardLayout from './components/layout/DashboardLayout'

// // // Add this import at the top with other imports
// // import AIBookings from './Pages/admin/AIBookings'

// // // ===== Auth Pages =====
// // import Login from './Pages/auth/Login'
// // import Register from './Pages/auth/Register'
// // import ForgotPassword from './Pages/auth/ForgotPassword'
// // import GoogleCallback from './Pages/auth/GoogleCallback'
// // import PricingPage from './Pages/pricing/PricingPage'

// // // ===== Dashboard =====
// // import Dashboard from './Pages/dashboard/Dashboard'
// // import Analytics from './Pages/dashboard/Analytics'
// // import Reports from './Pages/dashboard/Reports'

// // // ===== CRM =====
// // import Contacts from './Pages/crm/Contacts'
// // import Leads from './Pages/crm/Leads'
// // import Pipeline from './Pages/crm/Pipeline'
// // import ServiceRequests from './Pages/crm/ServiceRequests'

// // // ===== Scheduling =====
// // import Calendar from './Pages/scheduling/Calender'
// // import JobScheduler from './Pages/scheduling/JobSchedular'
// // import RouteOptimization from './Pages/scheduling/RouteOptimization'

// // // ===== Field Service =====
// // import Jobs from './Pages/field_service/Jobs'
// // import Technicians from './Pages/field_service/Technicians'
// // import GPSTracking from './Pages/field_service/Gps_Tracking'
// // import MobileWorkflow from './Pages/field_service/MobileWorkflow'

// // // ===== Estimates / Invoices =====
// // import EstimateList from './Pages/estimates/EstimateList'
// // import EstimateBuilder from './Pages/estimates/EstimateBuilder'
// // import InvoiceGenerator from './Pages/estimates/InvoiceGenerator'
// // import InvoiceList from './Pages/estimates/InvoiceList'

// // // ===== AI Automation =====
// // // import AIFlows from './Pages/ai_automation/AIFlows'
// // import SMSCampaigns from './Pages/ai_automation/SMSCampaigns'
// // import LeadScoring from './Pages/ai_automation/LeadScoring'
// // import AutomationBuilder from './Pages/ai_automation/AutomationBuilder'

// // // ===== Customer Portal =====
// // import CustomerDashboard from './Pages/customer_portal/CustomerDashboard'
// // import ServiceHistory from './Pages/customer_portal/ServiceHistory'
// // import CustomerDocuments from './Pages/customer_portal/CustomerDocuments'
// // import JobTracking from './Pages/customer_portal/JobTracking'
// // import PaymentPortal from './Pages/customer_portal/PaymentPortal'
// // import PaymentsDashboard from './Pages/customer_portal/PaymentsDashboard'

// // // ===== Technician Portal =====
// // import TechnicianDashboard from './Pages/technician_portal/TechnicianDashboard'
// // import JobsList from './Pages/technician_portal/JobsList'
// // import JobDetail from './Pages/technician_portal/JobDetail'
// // import TechRouteOptimization from './Pages/technician_portal/RouteOptimization'
// // import TechnicianSchedule from './Pages/technician_portal/TechnicianSchedule'
// // import TechnicianStats from './Pages/technician_portal/TechnicianStats'
// // import TechnicianSettings from './Pages/technician_portal/TechnicianSettings'

// // // ===== Settings =====
// // import Profile from './Pages/settings/Profile'
// // import Company from './Pages/settings/Company'
// // import Users from './Pages/settings/Users'
// // import Integrations from './Pages/settings/Integration'

// // import ServiceManagement from './Pages/admin/ServiceManagement'
// // import AdminDocuments from './Pages/admin/AdminDocuments'
// // // import AIAnalytics from './Pages/admin/AIAnalytics'

// // // Create QueryClient for React Query
// // const queryClient = new QueryClient({
// //   defaultOptions: {
// //     queries: {
// //       staleTime: 5 * 60 * 1000, // 5 minutes
// //       retry: 1,
// //       refetchOnWindowFocus: false,
// //     },
// //   },
// // })

// // function App() {
// //   const { user, isAuthenticated, login } = useAuthStore()
// //   const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

// //   // Dev bypass for easier development
// //   useEffect(() => {
// //     if (skipAuth && !isAuthenticated) {
// //       login(
// //         {
// //           id: 'dev-user-1',
// //           email: 'dev@servicecrm.com',
// //           name: 'Development User',
// //           role: 'admin',
// //           company_id: 'dev-company-1',
// //           avatar_url: '',
// //           phone: '',
// //           is_active: true,
// //           created_at: new Date().toISOString(),
// //           updated_at: new Date().toISOString(),
// //           last_login: new Date().toISOString(),
// //           permissions: ['*'],
// //           preferences: {
// //             theme: 'light',
// //             timezone: 'UTC',
// //             language: 'en',
// //             notifications: {
// //               email: true,
// //               sms: true,
// //               push: true,
// //               job_updates: true,
// //               payment_updates: true,
// //             },
// //             dashboard_layout: {},
// //           },
// //         },
// //         'dev-token-123'
// //       )
// //     }
// //   }, [skipAuth, isAuthenticated, login])

// //   const effectivelyAuthenticated = skipAuth || isAuthenticated

// //   return (
// //     <QueryClientProvider client={queryClient}>
// //       <Router>
// //         <div className="min-h-screen bg-gray-50">
// //           <Routes>
// //             {!effectivelyAuthenticated ? (
// //               // ===== UNAUTHENTICATED ROUTES (WITHOUT AUTHLAYOUT) =====
// //               <>
// //                 <Route path="/" element={<Navigate to="/login" replace />} />
// //                 <Route path="/login" element={<Login />} />
// //                 <Route path="/auth/callback" element={<GoogleCallback />} />
// //                 <Route path="/register" element={<Register />} />
// //                 {/* // In your App.tsx or routing file */}
// // <Route path="/pricing" element={<PricingPage />} />
// //                 <Route path="/forgot-password" element={<ForgotPassword />} />

// //                 {/* Public Customer Portal */}
// //                 <Route path="/customer-portal/dashboard" element={<CustomerDashboard />} />
// //                 <Route path="/customer-portal/service-history" element={<ServiceHistory />} />
// //                 <Route path="/customer-portal/payment" element={<PaymentPortal />} />
// // {/* // CUSTOMER - Same Profile component, different route   */}
// //                 <Route path="/customer-portal/profile" element={<Profile />} />
// //                 <Route path="/customer-portal/settings" element={<Profile />} />
// //                 <Route path="/customer-portal" element={<Navigate to="/customer-portal/dashboard" replace />} />

// //                 {/* Catch all - redirect to login */}
// //                 <Route path="*" element={<Navigate to="/login" replace />} />
// //               </>
// //             ) : (
// //               // ===== AUTHENTICATED ROUTES =====
// //               <>
// //                 <Route path="/" element={<DashboardLayout />}>
// //                   {/* Dashboard Routes */}
// //                   <Route index element={<Navigate to="/dashboard" replace />} />
// //                   <Route path="dashboard" element={<Dashboard />} />
// //                   <Route path="analytics" element={<Analytics />} />
// //                   <Route path="reports" element={<Reports />} />

// //                   {/* ADD THIS NEW ROUTE */}
// //                   <Route path="/admin/documents" element={<AdminDocuments />} />
// //                   <Route path="admin/ai-bookings" element={<AIBookings />} />
// //                   <Route path="/admin/service-management" element={<ServiceManagement />} />
// //                   {/* <Route path="/admin/ai-analytics" element={<AIAnalytics />} /> */}

// //                   {/* CRM Routes */}
// //                   <Route path="crm/contacts" element={<Contacts />} />
// //                   <Route path="crm/leads" element={<Leads />} />
// //                   <Route path="crm/pipeline" element={<Pipeline />} />
// //                    <Route path="crm/service-requests" element={<ServiceRequests />} />  {/* 🆕 NEW ROUTE */}
// //                   <Route path="crm" element={<Navigate to="/crm/contacts" replace />} />

// //                   {/* Scheduling Routes */}
// //                   <Route path="scheduling/calendar" element={<Calendar />} />
// //                   <Route path="scheduling/job-scheduler" element={<JobScheduler />} />
// //                   <Route path="scheduling/route-optimization" element={<RouteOptimization />} />
// //                   <Route path="scheduling" element={<Navigate to="/scheduling/calendar" replace />} />

// //                   {/* Field Service Routes */}
// //                   <Route path="field-service/jobs" element={<Jobs />} />
// //                   <Route path="field-service/technicians" element={<Technicians />} />
// //                   <Route path="field-service/gps-tracking" element={<GPSTracking />} />
// //                   <Route path="field-service/mobile-workflow" element={<MobileWorkflow />} />
// //                   <Route path="field-service" element={<Navigate to="/field-service/jobs" replace />} />

// //                   {/* Estimates & Invoices Routes */}
// //                   <Route path="estimates" element={<EstimateList />} />
// //                   <Route path="/estimates/new" element={<EstimateBuilder />} />
// //                   <Route path="estimates/:id/edit" element={<EstimateBuilder />} />
// //                   <Route path="estimates/:estimateId/invoice" element={<InvoiceGenerator />} />
                  
// //                   {/* Separate Invoice Routes */}
// //                   <Route path="invoices" element={<InvoiceList />} />
// //                   <Route path="invoices/new" element={<InvoiceGenerator />} />
// //                   <Route path="invoices/:id/edit" element={<InvoiceGenerator />} />

// //                   {/* AI Automation Routes */}
// //                   {/* <Route path="ai-automation/flows" element={<AIFlows />} /> */}
// //                   <Route path="ai-automation/sms-campaigns" element={<SMSCampaigns />} />
// //                   <Route path="ai-automation/lead-scoring" element={<LeadScoring />} />
// //                   <Route path="ai-automation/automation-builder" element={<AutomationBuilder />} />
// //                   {/* <Route path="ai-automation" element={<Navigate to="/ai-automation/flows" replace />} /> */}

// //                   {/* Settings Routes */}
// //                   <Route path="settings/profile" element={<Profile />} />
// //                   <Route path="settings/company" element={<Company />} />
// //                   <Route path="settings/users" element={<Users />} />
// //                   <Route path="settings/integrations" element={<Integrations />} />
// //                   <Route path="settings" element={<Navigate to="/settings/profile" replace />} />

// //                   {/* Customer Portal for authenticated customers */}
// //                   {(user?.role === 'customer' || skipAuth) && (
// //                     <>
// //                       <Route path="customer-portal/dashboard" element={<CustomerDashboard />} />
// //                       <Route path="customer-portal/service-history" element={<ServiceHistory />} />
// //                       <Route path="customer-portal/documents" element={<CustomerDocuments />} />
// //                       <Route path="customer-portal/job-tracking" element={<JobTracking />} />
// //                       <Route path="customer-portal/job-tracking/:jobId" element={<JobTracking />} />
// //                       <Route path="customer-portal/payments" element={<PaymentsDashboard />} />
// //                       <Route path="customer-portal/payments/:invoiceId" element={<PaymentPortal />} />
// //                       {/* // CUSTOMER - Same Profile component, different route   */}
// // <Route path="/customer-portal/profile" element={<Profile />} />
// // <Route path="/customer-portal/settings" element={<Profile />} />
// //                       <Route path="customer-portal" element={<Navigate to="/customer-portal/dashboard" replace />} />
// //                     </>
// //                   )}
                  
// //                   {/* Technician Portal for technicians */}
// //                   {(user?.role === 'technician' || skipAuth) && (
// //                     <>
// //                       <Route path="technician-portal/dashboard" element={<TechnicianDashboard />} />
// //                       <Route path="technician-portal/jobs" element={<JobsList />} />
// //                       <Route path="technician-portal/jobs/:jobId" element={<JobDetail />} />
// //                       <Route path="technician-portal/route" element={<TechRouteOptimization />} />
// //                       <Route path="technician-portal/schedule" element={<TechnicianSchedule />} />
// //                       <Route path="technician-portal/stats" element={<TechnicianStats />} />
// //                       {/* <Route path="technician-portal/settings" element={<TechnicianSettings />} /> */}
// //                       {/* // TECHNICIAN - Same Profile component, different route */}
// // <Route path="/technician-portal/profile" element={<Profile />} />
// // <Route path="/technician-portal/settings" element={<Profile />} />
// //                       <Route path="technician-portal" element={<Navigate to="/technician-portal/dashboard" replace />} />
// //                     </>
// //                   )}

// //                   {/* Development routes when auth is bypassed */}
// //                   {skipAuth && (
// //                     <>
// //                       <Route path="dev-login" element={<Login />} />
// //                       <Route path="dev-register" element={<Register />} />
// //                       <Route path="dev-forgot-password" element={<ForgotPassword />} />
// //                     </>
// //                   )}

// //                   {/* Redirect based on role */}
// //                   {user?.role === 'customer' ? (
// //                     <Route path="*" element={<Navigate to="/customer-portal/dashboard" replace />} />
// //                   ) : user?.role === 'technician' ? (
// //                     <Route path="*" element={<Navigate to="/technician-portal/dashboard" replace />} />
// //                   ) : (
// //                     <Route path="*" element={<Navigate to="/dashboard" replace />} />
// //                   )}
// //                 </Route>
// //               </>
// //             )}
// //           </Routes>

// //           {/* Global Toast Notifications */}
// //           <Toaster
// //             position="top-right"
// //             toastOptions={{
// //               duration: 4000,
// //               style: {
// //                 background: '#363636',
// //                 color: '#fff',
// //                 maxWidth: '500px',
// //               },
// //               success: {
// //                 style: {
// //                   background: '#10b981',
// //                 },
// //               },
// //               error: {
// //                 style: {
// //                   background: '#ef4444',
// //                 },
// //               },
// //             }}
// //           />
// //         </div>
// //       </Router>
// //     </QueryClientProvider>
// //   )
// // }

// // export default App


// // pricing plan
// // frontend/src/App.tsx - CORRECTED VERSION WITH PROPER PRICING INTEGRATION
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// import { useEffect } from 'react'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { Toaster } from 'react-hot-toast'
// import { useAuthStore } from './store/authStore'
// import DashboardLayout from './components/layout/DashboardLayout'

// // Add this import at the top with other imports
// import AIBookings from './Pages/admin/AIBookings'

// // ===== Auth Pages =====
// import Login from './Pages/auth/Login'
// import Register from './Pages/auth/Register'
// import ForgotPassword from './Pages/auth/ForgotPassword'
// import GoogleCallback from './Pages/auth/GoogleCallback'
// import PricingPage from './Pages/pricing/PricingPage'

// // ===== Dashboard =====
// import Dashboard from './Pages/dashboard/Dashboard'
// import Analytics from './Pages/dashboard/Analytics'
// import Reports from './Pages/dashboard/Reports'

// // ===== CRM =====
// import Contacts from './Pages/crm/Contacts'
// import Leads from './Pages/crm/Leads'
// import Pipeline from './Pages/crm/Pipeline'
// import ServiceRequests from './Pages/crm/ServiceRequests'

// // ===== Scheduling =====
// import Calendar from './Pages/scheduling/Calender'
// import JobScheduler from './Pages/scheduling/JobSchedular'
// import RouteOptimization from './Pages/scheduling/RouteOptimization'

// // ===== Field Service =====
// import Jobs from './Pages/field_service/Jobs'
// import Technicians from './Pages/field_service/Technicians'
// import GPSTracking from './Pages/field_service/Gps_Tracking'
// import MobileWorkflow from './Pages/field_service/MobileWorkflow'

// // ===== Estimates / Invoices =====
// import EstimateList from './Pages/estimates/EstimateList'
// import EstimateBuilder from './Pages/estimates/EstimateBuilder'
// import InvoiceGenerator from './Pages/estimates/InvoiceGenerator'
// import InvoiceList from './Pages/estimates/InvoiceList'

// // ===== AI Automation =====
// // import AIFlows from './Pages/ai_automation/AIFlows'
// import SMSCampaigns from './Pages/ai_automation/SMSCampaigns'
// import LeadScoring from './Pages/ai_automation/LeadScoring'
// import AutomationBuilder from './Pages/ai_automation/AutomationBuilder'

// // ===== Customer Portal =====
// import CustomerDashboard from './Pages/customer_portal/CustomerDashboard'
// import ServiceHistory from './Pages/customer_portal/ServiceHistory'
// import CustomerDocuments from './Pages/customer_portal/CustomerDocuments'
// import JobTracking from './Pages/customer_portal/JobTracking'
// import PaymentPortal from './Pages/customer_portal/PaymentPortal'
// import PaymentsDashboard from './Pages/customer_portal/PaymentsDashboard'

// // ===== Technician Portal =====
// import TechnicianDashboard from './Pages/technician_portal/TechnicianDashboard'
// import JobsList from './Pages/technician_portal/JobsList'
// import JobDetail from './Pages/technician_portal/JobDetail'
// import TechRouteOptimization from './Pages/technician_portal/RouteOptimization'
// import TechnicianSchedule from './Pages/technician_portal/TechnicianSchedule'
// import TechnicianStats from './Pages/technician_portal/TechnicianStats'
// import TechnicianSettings from './Pages/technician_portal/TechnicianSettings'

// // ===== Settings =====
// import Profile from './Pages/settings/Profile'
// import Company from './Pages/settings/Company'
// import Users from './Pages/settings/Users'
// import Integrations from './Pages/settings/Integration'

// import ServiceManagement from './Pages/admin/ServiceManagement'
// import AdminDocuments from './Pages/admin/AdminDocuments'
// // import AIAnalytics from './Pages/admin/AIAnalytics'

// // Create QueryClient for React Query
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 5 * 60 * 1000, // 5 minutes
//       retry: 1,
//       refetchOnWindowFocus: false,
//     },
//   },
// })

// // 🎯 PROTECTED PRICING COMPONENT
// function ProtectedPricingPage() {
//   const { user, hasActiveSubscription, needsPricingSelection } = useAuthStore()
  
//   // If user already has active subscription, redirect to appropriate dashboard
//   if (hasActiveSubscription()) {
//     const userRole = user?.role?.toLowerCase()
//     switch (userRole) {
//       case 'customer':
//         return <Navigate to="/customer-portal/dashboard" replace />
//       case 'technician':
//         return <Navigate to="/technician-portal/dashboard" replace />
//       default:
//         return <Navigate to="/dashboard" replace />
//     }
//   }
  
//   // If user needs pricing selection, show pricing page
//   if (needsPricingSelection()) {
//     return <PricingPage />
//   }
  
//   // Fallback redirect
//   return <Navigate to="/dashboard" replace />
// }

// function App() {
//   const { user, isAuthenticated, login, needsPricingSelection } = useAuthStore()
//   const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

//   // Dev bypass for easier development
//   useEffect(() => {
//     if (skipAuth && !isAuthenticated) {
//       login(
//         {
//           id: 'dev-user-1',
//           email: 'dev@servicecrm.com',
//           first_name: 'Development',
//           last_name: 'User',
//           name: 'Development User',
//           role: 'admin',
//           company_id: 'dev-company-1',
//           avatar_url: '',
//           phone: '',
//           created_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//           last_login: new Date().toISOString(),
//           permissions: ['*'],
//           preferences: {
//             theme: 'light',
//             timezone: 'UTC',
//             language: 'en',
//             notifications: {
//               email: true,
//               sms: true,
//               push: true,
//             },
//           },
//         },
//         'dev-token-123'
//       )
//     }
//   }, [skipAuth, isAuthenticated, login])

//   const effectivelyAuthenticated = skipAuth || isAuthenticated

//   return (
//     <QueryClientProvider client={queryClient}>
//       <Router>
//         <div className="min-h-screen bg-gray-50">
//           <Routes>
//             {!effectivelyAuthenticated ? (
//               // ===== UNAUTHENTICATED ROUTES =====
//               <>
//                 <Route path="/" element={<Navigate to="/login" replace />} />
//                 <Route path="/login" element={<Login />} />
//                 <Route path="/auth/callback" element={<GoogleCallback />} />
//                 <Route path="/register" element={<Register />} />
//                 <Route path="/forgot-password" element={<ForgotPassword />} />

//                 {/* 🚫 REMOVED: Pricing should not be accessible without auth */}
//                 {/* <Route path="/pricing" element={<PricingPage />} /> */}

//                 {/* Public Customer Portal (for customers who lost their login) */}
//                 <Route path="/customer-portal/dashboard" element={<CustomerDashboard />} />
//                 <Route path="/customer-portal/service-history" element={<ServiceHistory />} />
//                 <Route path="/customer-portal/payment" element={<PaymentPortal />} />
//                 <Route path="/customer-portal/profile" element={<Profile />} />
//                 <Route path="/customer-portal/settings" element={<Profile />} />
//                 <Route path="/customer-portal" element={<Navigate to="/customer-portal/dashboard" replace />} />

//                 {/* Catch all - redirect to login */}
//                 <Route path="*" element={<Navigate to="/login" replace />} />
//               </>
//             ) : (
//               // ===== AUTHENTICATED ROUTES =====
//               <>
//                 {/* 🎯 PRICING PAGE - Protected and Smart Routing */}
//                 <Route path="/pricing" element={<ProtectedPricingPage />} />
                
//                 <Route path="/" element={<DashboardLayout />}>
//                   {/* 🎯 SMART ROOT REDIRECT - Check subscription status */}
//                   <Route index element={
//                     needsPricingSelection() ? 
//                       <Navigate to="/pricing" replace /> : 
//                       <Navigate to="/dashboard" replace />
//                   } />
                  
//                   {/* Dashboard Routes */}
//                   <Route path="dashboard" element={<Dashboard />} />
//                   <Route path="analytics" element={<Analytics />} />
//                   <Route path="reports" element={<Reports />} />

//                   {/* Admin Routes */}
//                   <Route path="admin/documents" element={<AdminDocuments />} />
//                   <Route path="admin/ai-bookings" element={<AIBookings />} />
//                   <Route path="admin/service-management" element={<ServiceManagement />} />
//                   {/* <Route path="admin/ai-analytics" element={<AIAnalytics />} /> */}

//                   {/* CRM Routes */}
//                   <Route path="crm/contacts" element={<Contacts />} />
//                   <Route path="crm/leads" element={<Leads />} />
//                   <Route path="crm/pipeline" element={<Pipeline />} />
//                   <Route path="crm/service-requests" element={<ServiceRequests />} />
//                   <Route path="crm" element={<Navigate to="/crm/contacts" replace />} />

//                   {/* Scheduling Routes */}
//                   <Route path="scheduling/calendar" element={<Calendar />} />
//                   <Route path="scheduling/job-scheduler" element={<JobScheduler />} />
//                   <Route path="scheduling/route-optimization" element={<RouteOptimization />} />
//                   <Route path="scheduling" element={<Navigate to="/scheduling/calendar" replace />} />

//                   {/* Field Service Routes */}
//                   <Route path="field-service/jobs" element={<Jobs />} />
//                   <Route path="field-service/technicians" element={<Technicians />} />
//                   <Route path="field-service/gps-tracking" element={<GPSTracking />} />
//                   <Route path="field-service/mobile-workflow" element={<MobileWorkflow />} />
//                   <Route path="field-service" element={<Navigate to="/field-service/jobs" replace />} />

//                   {/* Estimates & Invoices Routes */}
//                   <Route path="estimates" element={<EstimateList />} />
//                   <Route path="estimates/new" element={<EstimateBuilder />} />
//                   <Route path="estimates/:id/edit" element={<EstimateBuilder />} />
//                   <Route path="estimates/:estimateId/invoice" element={<InvoiceGenerator />} />
                  
//                   {/* Separate Invoice Routes */}
//                   <Route path="invoices" element={<InvoiceList />} />
//                   <Route path="invoices/new" element={<InvoiceGenerator />} />
//                   <Route path="invoices/:id/edit" element={<InvoiceGenerator />} />

//                   {/* AI Automation Routes */}
//                   {/* <Route path="ai-automation/flows" element={<AIFlows />} /> */}
//                   <Route path="ai-automation/sms-campaigns" element={<SMSCampaigns />} />
//                   <Route path="ai-automation/lead-scoring" element={<LeadScoring />} />
//                   <Route path="ai-automation/automation-builder" element={<AutomationBuilder />} />
//                   {/* <Route path="ai-automation" element={<Navigate to="/ai-automation/flows" replace />} /> */}

//                   {/* Settings Routes */}
//                   <Route path="settings/profile" element={<Profile />} />
//                   <Route path="settings/company" element={<Company />} />
//                   <Route path="settings/users" element={<Users />} />
//                   <Route path="settings/integrations" element={<Integrations />} />
//                   <Route path="settings" element={<Navigate to="/settings/profile" replace />} />

//                   {/* Customer Portal for authenticated customers */}
//                   {(user?.role === 'customer' || skipAuth) && (
//                     <>
//                       <Route path="customer-portal/dashboard" element={<CustomerDashboard />} />
//                       <Route path="customer-portal/service-history" element={<ServiceHistory />} />
//                       <Route path="customer-portal/documents" element={<CustomerDocuments />} />
//                       <Route path="customer-portal/job-tracking" element={<JobTracking />} />
//                       <Route path="customer-portal/job-tracking/:jobId" element={<JobTracking />} />
//                       <Route path="customer-portal/payments" element={<PaymentsDashboard />} />
//                       <Route path="customer-portal/payments/:invoiceId" element={<PaymentPortal />} />
//                       <Route path="customer-portal/profile" element={<Profile />} />
//                       <Route path="customer-portal/settings" element={<Profile />} />
//                       <Route path="customer-portal" element={<Navigate to="/customer-portal/dashboard" replace />} />
//                     </>
//                   )}
                  
//                   {/* Technician Portal for technicians */}
//                   {(user?.role === 'technician' || skipAuth) && (
//                     <>
//                       <Route path="technician-portal/dashboard" element={<TechnicianDashboard />} />
//                       <Route path="technician-portal/jobs" element={<JobsList />} />
//                       <Route path="technician-portal/jobs/:jobId" element={<JobDetail />} />
//                       <Route path="technician-portal/route" element={<TechRouteOptimization />} />
//                       <Route path="technician-portal/schedule" element={<TechnicianSchedule />} />
//                       <Route path="technician-portal/stats" element={<TechnicianStats />} />
//                       <Route path="technician-portal/profile" element={<Profile />} />
//                       <Route path="technician-portal/settings" element={<Profile />} />
//                       <Route path="technician-portal" element={<Navigate to="/technician-portal/dashboard" replace />} />
//                     </>
//                   )}

//                   {/* Development routes when auth is bypassed */}
//                   {skipAuth && (
//                     <>
//                       <Route path="dev-login" element={<Login />} />
//                       <Route path="dev-register" element={<Register />} />
//                       <Route path="dev-forgot-password" element={<ForgotPassword />} />
//                     </>
//                   )}

//                   {/* 🎯 SMART FALLBACK REDIRECTS BASED ON SUBSCRIPTION STATUS */}
//                   <Route path="*" element={
//                     needsPricingSelection() ? (
//                       <Navigate to="/pricing" replace />
//                     ) : user?.role === 'customer' ? (
//                       <Navigate to="/customer-portal/dashboard" replace />
//                     ) : user?.role === 'technician' ? (
//                       <Navigate to="/technician-portal/dashboard" replace />
//                     ) : (
//                       <Navigate to="/dashboard" replace />
//                     )
//                   } />
//                 </Route>
//               </>
//             )}
//           </Routes>

//           {/* Global Toast Notifications */}
//           <Toaster
//             position="top-right"
//             toastOptions={{
//               duration: 4000,
//               style: {
//                 background: '#363636',
//                 color: '#fff',
//                 maxWidth: '500px',
//               },
//               success: {
//                 style: {
//                   background: '#10b981',
//                 },
//               },
//               error: {
//                 style: {
//                   background: '#ef4444',
//                 },
//               },
//             }}
//           />
//         </div>
//       </Router>
//     </QueryClientProvider>
//   )
// }

// export default App



















































// shan
// frontend/src/App.tsx - COMPLETE VERSION WITH LANDING PAGE + SUBSCRIPTION PROTECTION
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import DashboardLayout from './components/layout/DashboardLayout'
import { Helmet } from 'react-helmet'

// ===== Landing Page Components =====
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Problems from './components/Problems'
import Features from './components/Features'
import Industries from './components/Industries'
import Testimonials from './components/Testimonials'
import Pricing from './components/Pricing'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

import AIBookings from './Pages/admin/AIBookings'

// ===== Auth Pages =====
import Login from './Pages/auth/Login'
import Register from './Pages/auth/Register'
import ForgotPassword from './Pages/auth/ForgotPassword'
import GoogleCallback from './Pages/auth/GoogleCallback'
import PricingPage from './Pages/pricing/PricingPage'

// ===== Dashboard =====
import Dashboard from './Pages/dashboard/Dashboard'
import Analytics from './Pages/dashboard/Analytics'
import Reports from './Pages/dashboard/Reports'

// ===== CRM =====
import Contacts from './Pages/crm/Contacts'
import Leads from './Pages/crm/Leads'
import Pipeline from './Pages/crm/Pipeline'
import ServiceRequests from './Pages/crm/ServiceRequests'

// ===== Scheduling =====
import Calendar from './Pages/scheduling/Calender'
import JobScheduler from './Pages/scheduling/JobSchedular'
import RouteOptimization from './Pages/scheduling/RouteOptimization'

// ===== Field Service =====
import Jobs from './Pages/field_service/Jobs'
import Technicians from './Pages/field_service/Technicians'
import GPSTracking from './Pages/field_service/Gps_Tracking'
import MobileWorkflow from './Pages/field_service/MobileWorkflow'

// ===== Estimates / Invoices =====
import EstimateList from './Pages/estimates/EstimateList'
import EstimateBuilder from './Pages/estimates/EstimateBuilder'
import InvoiceGenerator from './Pages/estimates/InvoiceGenerator'
import InvoiceList from './Pages/estimates/InvoiceList'

// ===== AI Automation =====
import SMSCampaigns from './Pages/ai_automation/SMSCampaigns'
import LeadScoring from './Pages/ai_automation/LeadScoring'
import AutomationBuilder from './Pages/ai_automation/AutomationBuilder'

// ===== Customer Portal =====
import CustomerDashboard from './Pages/customer_portal/CustomerDashboard'
import ServiceHistory from './Pages/customer_portal/ServiceHistory'
import CustomerDocuments from './Pages/customer_portal/CustomerDocuments'
import JobTracking from './Pages/customer_portal/JobTracking'
import PaymentPortal from './Pages/customer_portal/PaymentPortal'
import PaymentsDashboard from './Pages/customer_portal/PaymentsDashboard'

// ===== Technician Portal =====
import TechnicianDashboard from './Pages/technician_portal/TechnicianDashboard'
import JobsList from './Pages/technician_portal/JobsList'
import JobDetail from './Pages/technician_portal/JobDetail'
import TechRouteOptimization from './Pages/technician_portal/RouteOptimization'
import TechnicianSchedule from './Pages/technician_portal/TechnicianSchedule'
import TechnicianStats from './Pages/technician_portal/TechnicianStats'
import TechnicianSettings from './Pages/technician_portal/TechnicianSettings'

// ===== Settings =====
import Profile from './Pages/settings/Profile'
import Company from './Pages/settings/Company'
import Users from './Pages/settings/Users'
import Integrations from './Pages/settings/Integration'

import ServiceManagement from './Pages/admin/ServiceManagement'
import AdminDocuments from './Pages/admin/AdminDocuments'

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 🎯 LANDING PAGE COMPONENT
function LandingPage() {
  return (
    <>
      <Helmet>
        <title>All-In-One CRM & Field Service Software | Storm AI</title>
        <meta
          name="description"
          content="Grow your service business with powerful, easy-to-use CRM software. Automate scheduling, quoting, invoicing, and follow-ups."
        />
      </Helmet>

      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-16">
          <Hero />
          <Problems />
          <Features />
          <Industries />
          <Testimonials />
          <Pricing />
          <FinalCTA />
          <Footer />
        </div>
      </div>
    </>
  );
}

// 🛡️ SUBSCRIPTION GUARD - Protects customer routes
function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, hasActiveSubscription } = useAuthStore()
  const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

  const userRole = user?.role?.toLowerCase()

  // Skip subscription check in dev mode
  if (skipAuth) {
    return <>{children}</>
  }

  // Only customers need subscription check
  // Use the hasActiveSubscription() method from the store for consistency
  if (userRole === 'customer' && !hasActiveSubscription()) {
    return <Navigate to="/pricing" replace />
  }

  return <>{children}</>
}

// 🎯 PROTECTED PRICING COMPONENT
function ProtectedPricingPage() {
  const { user, hasActiveSubscription, needsPricingSelection } = useAuthStore()

  // If user already has active subscription, redirect to appropriate dashboard
  if (hasActiveSubscription()) {
    const userRole = user?.role?.toLowerCase()
    switch (userRole) {
      case 'customer':
        return <Navigate to="/customer-portal/dashboard" replace />
      case 'technician':
        return <Navigate to="/technician-portal/dashboard" replace />
      default:
        return <Navigate to="/dashboard" replace />
    }
  }

  // Show pricing page for users who need to select a plan
  return <PricingPage />
}

function App() {
  const { user, isAuthenticated, login, needsPricingSelection } = useAuthStore()
  const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

  // Dev bypass for easier development
  useEffect(() => {
    if (skipAuth && !isAuthenticated) {
      login(
        {
          id: 'dev-user-1',
          email: 'dev@servicecrm.com',
          first_name: 'Development',
          last_name: 'User',
          name: 'Development User',
          role: 'admin',
          company_id: 'dev-company-1',
          avatar_url: '',
          phone: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          permissions: ['*'],
          preferences: {
            theme: 'light',
            timezone: 'UTC',
            language: 'en',
            notifications: {
              email: true,
              sms: true,
              push: true,
            },
          },
        },
        'dev-token-123'
      )
    }
  }, [skipAuth, isAuthenticated, login])

  const effectivelyAuthenticated = skipAuth || isAuthenticated

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {!effectivelyAuthenticated ? (
              // ===== UNAUTHENTICATED ROUTES =====
              <>
                {/* 🎯 LANDING PAGE - Show at root */}
                <Route path="/" element={<LandingPage />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<GoogleCallback />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Catch all - redirect to landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              // ===== AUTHENTICATED ROUTES =====
              <>
                {/* 🎯 PRICING PAGE - Protected and Smart Routing */}
                <Route path="/pricing" element={<ProtectedPricingPage />} />

                <Route path="/" element={<DashboardLayout />}>
                  {/* 🎯 SMART ROOT REDIRECT - Check subscription status */}
                  <Route index element={
                    needsPricingSelection() ?
                      <Navigate to="/pricing" replace /> :
                      <Navigate to="/dashboard" replace />
                  } />

                  {/* Dashboard Routes */}
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="reports" element={<Reports />} />

                  {/* Admin Routes */}
                  <Route path="admin/documents" element={<AdminDocuments />} />
                  <Route path="admin/ai-bookings" element={<AIBookings />} />
                  <Route path="admin/service-management" element={<ServiceManagement />} />

                  {/* CRM Routes */}
                  <Route path="crm/contacts" element={<Contacts />} />
                  <Route path="crm/leads" element={<Leads />} />
                  <Route path="crm/pipeline" element={<Pipeline />} />
                  <Route path="crm/service-requests" element={<ServiceRequests />} />
                  <Route path="crm" element={<Navigate to="/crm/contacts" replace />} />

                  {/* Scheduling Routes */}
                  <Route path="scheduling/calendar" element={<Calendar />} />
                  <Route path="scheduling/job-scheduler" element={<JobScheduler />} />
                  <Route path="scheduling/route-optimization" element={<RouteOptimization />} />
                  <Route path="scheduling" element={<Navigate to="/scheduling/calendar" replace />} />

                  {/* Field Service Routes */}
                  <Route path="field-service/jobs" element={<Jobs />} />
                  <Route path="field-service/technicians" element={<Technicians />} />
                  <Route path="field-service/gps-tracking" element={<GPSTracking />} />
                  <Route path="field-service/mobile-workflow" element={<MobileWorkflow />} />
                  <Route path="field-service" element={<Navigate to="/field-service/jobs" replace />} />

                  {/* Estimates & Invoices Routes */}
                  <Route path="estimates" element={<EstimateList />} />
                  <Route path="estimates/new" element={<EstimateBuilder />} />
                  <Route path="estimates/:id/edit" element={<EstimateBuilder />} />
                  <Route path="estimates/:estimateId/invoice" element={<InvoiceGenerator />} />

                  {/* Separate Invoice Routes */}
                  <Route path="invoices" element={<InvoiceList />} />
                  <Route path="invoices/new" element={<InvoiceGenerator />} />
                  <Route path="invoices/:id/edit" element={<InvoiceGenerator />} />

                  {/* AI Automation Routes */}
                  <Route path="ai-automation/sms-campaigns" element={<SMSCampaigns />} />
                  <Route path="ai-automation/lead-scoring" element={<LeadScoring />} />
                  <Route path="ai-automation/automation-builder" element={<AutomationBuilder />} />

                  {/* Settings Routes */}
                  <Route path="settings/profile" element={<Profile />} />
                  <Route path="settings/company" element={<Company />} />
                  <Route path="settings/users" element={<Users />} />
                  <Route path="settings/integrations" element={<Integrations />} />
                  <Route path="settings" element={<Navigate to="/settings/profile" replace />} />

                  {/* 🛡️ CUSTOMER PORTAL - PROTECTED WITH SUBSCRIPTION GUARD */}
                  {(user?.role === 'customer' || skipAuth) && (
                    <>
                      <Route path="customer-portal/dashboard" element={
                        <SubscriptionGuard>
                          <CustomerDashboard />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/service-history" element={
                        <SubscriptionGuard>
                          <ServiceHistory />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/documents" element={
                        <SubscriptionGuard>
                          <CustomerDocuments />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/job-tracking" element={
                        <SubscriptionGuard>
                          <JobTracking />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/job-tracking/:jobId" element={
                        <SubscriptionGuard>
                          <JobTracking />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/payments" element={
                        <SubscriptionGuard>
                          <PaymentsDashboard />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/payments/:invoiceId" element={
                        <SubscriptionGuard>
                          <PaymentPortal />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/profile" element={
                        <SubscriptionGuard>
                          <Profile />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal/settings" element={
                        <SubscriptionGuard>
                          <Profile />
                        </SubscriptionGuard>
                      } />
                      <Route path="customer-portal" element={<Navigate to="/customer-portal/dashboard" replace />} />
                    </>
                  )}

                  {/* Technician Portal for technicians - NO SUBSCRIPTION REQUIRED */}
                  {(user?.role === 'technician' || skipAuth) && (
                    <>
                      <Route path="technician-portal/dashboard" element={<TechnicianDashboard />} />
                      <Route path="technician-portal/jobs" element={<JobsList />} />
                      <Route path="technician-portal/jobs/:jobId" element={<JobDetail />} />
                      <Route path="technician-portal/route" element={<TechRouteOptimization />} />
                      <Route path="technician-portal/schedule" element={<TechnicianSchedule />} />
                      <Route path="technician-portal/stats" element={<TechnicianStats />} />
                      <Route path="technician-portal/profile" element={<Profile />} />
                      <Route path="technician-portal/settings" element={<Profile />} />
                      <Route path="technician-portal" element={<Navigate to="/technician-portal/dashboard" replace />} />
                    </>
                  )}

                  {/* Development routes when auth is bypassed */}
                  {skipAuth && (
                    <>
                      <Route path="dev-login" element={<Login />} />
                      <Route path="dev-register" element={<Register />} />
                      <Route path="dev-forgot-password" element={<ForgotPassword />} />
                    </>
                  )}

                  {/* 🎯 SMART FALLBACK REDIRECTS BASED ON SUBSCRIPTION STATUS */}
                  <Route path="*" element={
                    needsPricingSelection() ? (
                      <Navigate to="/pricing" replace />
                    ) : user?.role === 'customer' ? (
                      <Navigate to="/customer-portal/dashboard" replace />
                    ) : user?.role === 'technician' ? (
                      <Navigate to="/technician-portal/dashboard" replace />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  } />
                </Route>
              </>
            )}
          </Routes>

          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                maxWidth: '500px',
              },
              success: {
                style: {
                  background: '#10b981',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App