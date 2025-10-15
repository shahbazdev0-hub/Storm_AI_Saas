// src/components/FinalCTA.tsx
import React, { useState } from "react";
import FreeTrialForm from "./FreeTrialForm";
import DemoBookingForm from "./DemoBookingForm";
import { FaPhoneAlt } from "react-icons/fa";

// Define props interface
interface FinalCTAProps {}

export default function FinalCTA({}: FinalCTAProps) {
  const [showTrialForm, setShowTrialForm] = useState<boolean>(false);
  const [showDemoForm, setShowDemoForm] = useState<boolean>(false);

  return (
    <section className="py-16 px-4 text-center bg-[#0038FF] text-white" id="trial">
      <h2 className="text-3xl font-bold">Ready to Grow Smarter?</h2>
      <p className="mt-2">
        Start your 7 Day free trial or book a quick demo. No credit card required.
      </p>
      <div className="mt-6 flex justify-center gap-4 flex-wrap">
        <button
          onClick={() => setShowTrialForm(true)}
          className="bg-white text-[#0038FF] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Start 7 Day Free Trial
        </button>
        <button
          onClick={() => setShowDemoForm(true)}
          className="border-2 border-white text-white px-6 py-3 rounded-lg flex items-center font-semibold hover:bg-white hover:text-[#0038FF] transition"
        >
          <FaPhoneAlt className="mr-2" />
          Book a Demo
        </button>
      </div>

      {/* Modal for Free Trial Form */}
      {showTrialForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative shadow-lg">
            <button
              onClick={() => setShowTrialForm(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
            <FreeTrialForm />
          </div>
        </div>
      )}

      {/* Modal for Demo Booking Form */}
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