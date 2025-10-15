// src/components/Testimonials.tsx
import React from "react";

// Define props interface
interface TestimonialsProps {}

export default function Testimonials({}: TestimonialsProps) {
  return (
    <section className="py-16 px-4 !bg-[#0038FF]/5 text-center">
      <h2 className="text-3xl font-bold text-[#0F1724]">
        Trusted by Growing Service Businesses
      </h2>
      <p className="mt-4 max-w-xl mx-auto text-[#6B7280]">
        "We cut our admin time in half and booked 30% more jobs within 60 days."
        — Mike R., Lawn Care Owner
      </p>
    </section>
  );
}