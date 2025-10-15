// src/components/Problems.tsx
import React from "react";
import { FaUserTimes, FaCalendarTimes } from "react-icons/fa";
import { MdOutlineRequestQuote } from "react-icons/md";

// Define problem item interface
interface ProblemItem {
  text: string;
  icon: React.ReactNode;
}

// Define props interface
interface ProblemsProps {}

export default function Problems({}: ProblemsProps) {
  const items: ProblemItem[] = [
    {
      text: "Missed leads & follow-ups",
      icon: <FaUserTimes className="text-red-500" size={40} />
    },
    {
      text: "Confusing schedules & double bookings",
      icon: <FaCalendarTimes className="text-orange-500" size={40} />
    },
    {
      text: "Delayed quotes & unpaid invoices",
      icon: <MdOutlineRequestQuote className="text-yellow-500" size={40} />
    }
  ];

  return (
    <section className="py-16 px-4 text-center">
      <h2 className="text-3xl font-bold text-[#0F1724] max-w-3xl mx-auto">
        You Didn't Start Your Business to Get Buried in Admin Work.
      </h2>

      <div className="mt-8 grid md:grid-cols-3 gap-8">
        {items.map((item, i) => (
          <div
            key={i}
            className="!bg-white shadow-md rounded-lg p-8 flex flex-col items-center border border-gray-100 hover:!border-[#0038FF] transition-colors duration-300"
          >
            {item.icon}
            <p className="mt-4 text-[#6B7280] text-lg font-medium text-center leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}