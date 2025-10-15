// src/components/Features.tsx
import React from "react";
import { HiOutlineBadgeCheck } from "react-icons/hi";

// Define the feature structure interface
interface Feature {
  title: string;
  points: string[];
}

// Define props interface
interface FeaturesProps {}

export default function Features({}: FeaturesProps) {
  const features: Feature[] = [
    { 
      title: "CRM & Customer Management", 
      points: ["Contacts, notes, tags", "Role-based access", "Clean dashboard"] 
    },
    { 
      title: "Scheduling & Dispatch", 
      points: ["Drag-and-drop calendar", "Tech assignment", "GPS tracking"] 
    },
    { 
      title: "Quotes & Invoices", 
      points: ["Estimate builder", "One-click invoices", "Approval portal"] 
    },
    { 
      title: "AI Sales Assistant", 
      points: ["Auto follow-up via SMS", "Booking logic", "Campaign builder"] 
    },
  ];

  return (
    <section id="features" className="py-16 px-4 !bg-[#0038FF]/5">
      <h2 className="text-3xl font-bold text-center text-[#0F1724] max-w-2xl mx-auto">
        Feature Highlights
      </h2>

      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((f, i) => (
          <div
            key={i}
            className="!bg-white rounded-lg shadow-md p-8 border border-gray-100 hover:!border-[#0038FF] transition-colors duration-300 flex flex-col"
          >
            <h3 className="font-semibold text-[#0038FF] text-lg">{f.title}</h3>
            <ul className="mt-4 text-[#6B7280] space-y-2">
              {f.points.map((p, idx) => (
                <li key={idx} className="flex items-start">
                  <HiOutlineBadgeCheck className="text-[#0038FF] mt-1 mr-2 flex-shrink-0" size={20} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}