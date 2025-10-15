// src/components/Footer.tsx
import React from "react";

// Define props interface
interface FooterProps {}

export default function Footer({}: FooterProps) {
  return (
    <footer 
      id="footer" 
      className="py-8 px-4 text-center !bg-[#0F1724] text-white" 
    >
      <p className="text-white">&copy; {new Date().getFullYear()} Storm AI All rights reserved.</p>
      <div className="mt-2 text-sm text-gray-400">
        Powered by Storm AI
      </div>
    </footer>
  );
}