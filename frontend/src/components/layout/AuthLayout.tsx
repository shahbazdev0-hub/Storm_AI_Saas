// // frontend/src/components/layout/AuthLayout.tsx
// import { Outlet } from 'react-router-dom'

// export default function AuthLayout() {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Optional: Add a simple header for branding */}
//        <div className="absolute top-0 left-0 right-0 z-10">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-6">
//             <div className="flex items-center">
//               <img 
//                 src="/rlogo.png" 
//                 alt="STORM AI Logo" 
//                 className="h-8 w-8 object-contain"
//               />
//               <span className="ml-2 text-xl font-bold text-gray-900">STORM AI</span>
//             </div> 
//             <div className="text-sm text-black">
//               AI-Enhanced Service Management
//             </div> 
//           </div>
//         </div>
//       </div>

//       {/* Main content area - this will render Login, Register, ForgotPassword */}
//       <main className="pt-20">
//         <Outlet />
//       </main>
//     </div>
//   )
// }