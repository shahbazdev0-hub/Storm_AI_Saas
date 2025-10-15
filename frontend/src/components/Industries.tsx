// src/components/Industries.tsx
import React from "react";

// Define props interface
interface IndustriesProps {}

export default function Industries({}: IndustriesProps) {
  const industries: string[] = [
    "Pest Control", 
    "Lawn Care", 
    "Roofing", 
    "Cleaning Services", 
    "Home Repair"
  ];

  return (
    <section id="industries" className="py-16 px-4 text-center">
      <h2 className="text-3xl font-bold text-[#0F1724]">Perfect For:</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {industries.map((ind, i) => (
          <span key={i} className="!bg-[#0038FF]/10 text-[#0038FF] px-4 py-2 rounded-lg font-medium">
            {ind}
          </span>
        ))}
      </div>
    </section>
  );
}