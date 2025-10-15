// src/components/Navbar.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import FreeTrialForm from "./FreeTrialForm";

// Define navigation link interface
interface NavLink {
  name: string;
  href: string;
}

// Define props interface
interface NavbarProps {}

export default function Navbar({}: NavbarProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const navigate = useNavigate();

  const links: NavLink[] = [
    { name: "Features", href: "#features" },
    { name: "Industries", href: "#industries" },
    { name: "Pricing", href: "#pricing" },
    { name: "Contact", href: "#footer" },
  ];

  // When clicking the Start Free Trial button
  const openForm = () => {
    setShowForm(true);
    setIsOpen(false); // close mobile menu if open
  };

  // Close modal form
  const closeForm = () => {
    setShowForm(false);
  };

  // Navigate to login page
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <nav className="bg-white fixed top-0 left-0 w-full z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              <img src="/Storm AI Logo.png" alt="Logo" className="h-40 w-auto" />
            </a>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  className="text-[#0F1724] hover:text-[#0038FF] transition"
                >
                  {link.name}
                </a>
              ))}
              <button
                onClick={handleLogin}
                className="text-[#0F1724] hover:text-[#0038FF] transition font-medium"
              >
                Login
              </button>
              <button
                onClick={openForm}
                className="bg-[#0038FF] text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
              >
                Start Free Trial
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <FiX size={24} className="text-[#0F1724]" />
                ) : (
                  <FiMenu size={24} className="text-[#0F1724]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-sm">
            <div className="px-4 py-4 space-y-3">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-[#0F1724] hover:text-[#0038FF] transition"
                >
                  {link.name}
                </a>
              ))}
              <button
                onClick={handleLogin}
                className="block text-[#0F1724] hover:text-[#0038FF] transition font-medium w-full text-left"
              >
                Login
              </button>
              <button
                onClick={openForm}
                className="block bg-[#0038FF] text-white px-4 py-2 rounded-lg text-center w-full hover:opacity-90 transition"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Modal for Free Trial Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative shadow-lg">
            <button
              onClick={closeForm}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
            <FreeTrialForm />
          </div>
        </div>
      )}
    </>
  );
}