
// import React from 'react';
// import { Navigate, Outlet } from 'react-router-dom';
// import Navbar from './components/NavBar';
// import Footer from './components/footers';

// const PrivateRoute = ({ requireAdmin }) => {
//   const token = localStorage.getItem('token');
//   const isAdmin = localStorage.getItem('adminAuth') === 'true';

//   // Redirect to login if no token
//   if (!token && !isAdmin) {
//     return <Navigate to="/login" replace />;
//   }

//   // Handle admin routes
//   if (requireAdmin) {
//     if (!isAdmin) {
//       return <Navigate to="/dashboard" replace />; // Redirect non-admin users to dashboard
//     }
//     // Return admin layout without Navbar and Footer
//     return <Outlet />;
//   }

//   // If user is admin and tries to access regular routes, redirect to admin dashboard
//   if (isAdmin && !requireAdmin) {
//     return <Navigate to="/admin" replace />;
//   }

//   // Regular authenticated user layout
//   return (
//     <div className="flex flex-col min-h-screen">
//       <Navbar />
//       <div className="flex-grow pt-[80px]">
//         <div className="flex-1 p-6">
//           <Outlet />
//         </div>
//       </div>
//       <Footer />
//     </div>
//   );
// };

// export default PrivateRoute;
// import React from 'react';
// import { Navigate, Outlet } from 'react-router-dom';
// import Navbar from './components/NavBar';
// import Footer from './components/footers';

// const PrivateRoute = ({ requireAdmin }) => {
//   const token = localStorage.getItem('token');
//   const isAdmin = localStorage.getItem('adminAuth') === 'true';

//   // Redirect to login if no token
//   if (!token && !isAdmin) {
//     return <Navigate to="/login" replace />;
//   }

//   // Handle admin routes
//   if (requireAdmin) {
//     if (!isAdmin) {
//       return <Navigate to="/dashboard" replace />; // Redirect non-admin users to dashboard
//     }
//     // Return admin layout without Navbar and Footer
//     return <Outlet />;
//   }

//   // If user is admin and tries to access regular routes, redirect to admin dashboard
//   if (isAdmin && !requireAdmin) {
//     return <Navigate to="/admin" replace />;
//   }

//   // Regular authenticated user layout
//   return (
//     <div className="flex flex-col min-h-screen">
//       <Navbar />
//       <div className="flex-grow pt-[80px]">
//         <div className="flex-1 p-6">
//           <Outlet />
//         </div>
//       </div>
//       <Footer />
//     </div>
//   );
// };

// export default PrivateRoute;

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/NavBar';
import Footer from './components/footers';

const PrivateRoute = ({ requireAdmin }) => {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('adminAuth') === 'true';
  const adminEmail = localStorage.getItem('adminEmail');

  // Function to check if admin credentials are valid
  const isValidAdmin = () => {
    return isAdmin && adminEmail === 'taha@gmail.com';
  };

  // Redirect to login if no authentication at all
  if (!token && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Handle admin routes
  if (requireAdmin) {
    // Check for valid admin credentials
    if (!isValidAdmin()) {
      localStorage.removeItem('adminAuth'); // Clear invalid admin auth
      localStorage.removeItem('adminEmail');
      return <Navigate to="/login" replace />;
    }
    // Return admin layout without Navbar and Footer
    return <Outlet />;
  }

  // If user is admin and tries to access regular routes, redirect to admin dashboard
  if (isValidAdmin() && !requireAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Regular authenticated user layout
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow pt-[80px]">
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivateRoute;