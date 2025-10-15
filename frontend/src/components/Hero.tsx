// src/Pages/landing/components/Hero.tsx
import React, { useState } from "react";
import FreeTrialForm from "./FreeTrialForm";
import DemoBookingForm from "./DemoBookingForm";
import { FaPhoneAlt } from "react-icons/fa";

// Define props interface
interface HeroProps {}

export default function Hero({}: HeroProps) {
  const [showFreeTrial, setShowFreeTrial] = useState<boolean>(false);
  const [showDemoForm, setShowDemoForm] = useState<boolean>(false);

  return (
    <section className="py-16 px-4 !bg-gradient-to-b !from-[#0038FF]/5 !to-white text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-[#0F1724]">
        Run Your Business. Not Just Chase It.
      </h1>
      <p className="mt-4 text-lg text-[#6B7280] max-w-2xl mx-auto">
        Book jobs faster, close more deals, and deliver 5-star service — without the admin headache.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <button onClick={() => setShowFreeTrial(true)} className="btn-primary">
          Start 7 Day Free Trial
        </button>
        <button
          onClick={() => setShowDemoForm(true)}
          className="border border-gray-300 text-darktext px-6 py-3 rounded-lg flex items-center hover:bg-gray-50 transition"
        >
          <FaPhoneAlt className="mr-2" />
          Book a Demo
        </button>
      </div>

      <div className="mt-10">
        <img
          src="/Dashboard Ui.png"
          alt="Dashboard UI"
          className="w-full max-w-4xl mx-auto rounded-xl shadow-lg h-auto"
        />
      </div>

      {/* Free Trial Modal */}
      {showFreeTrial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative shadow-lg">
            <button
              onClick={() => setShowFreeTrial(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
            <FreeTrialForm />
          </div>
        </div>
      )}

      {/* Book a Demo Modal */}
      {showDemoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative shadow-lg">
            <button
              onClick={() => setShowDemoForm(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-center text-[#0F1724]">Book a Demo</h2>
            <DemoBookingForm />
          </div>
        </div>
      )}
    </section>
  );
}