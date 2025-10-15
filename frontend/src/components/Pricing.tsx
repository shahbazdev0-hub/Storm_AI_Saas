// src/Pages/landing/components/Pricing.tsx
import React, { useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import FreeTrialForm from "./FreeTrialForm";

// Define plan structure interface
interface Plan {
  title: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  extraInfo?: string;
}

// Define plans object interface
interface Plans {
  starter: Plan;
  growth: Plan;
  pro: Plan;
}

// Define billing cycle type
type BillingCycle = "monthly" | "annual";

// Define plan key type
type PlanKey = keyof Plans;

// Define props interface
interface PricingProps {}

const plans: Plans = {
  starter: {
    title: "Starter",
    description: "Perfect for solo operators and new businesses getting off the ground.",
    monthlyPrice: 39,
    annualPrice: 29,
    features: [
      "Contact & Lead Management",
      "Estimate & Invoice Builder",
      "Sales Dashboard & Conversion Reports",
      "QuickBooks + Google Calendar Sync",
      "Job Scheduling Calendar",
      "Customer Notes & History",
      "Email Notifications",
    ],
  },
  growth: {
    title: "Growth (Most Popular)",
    description: "Ideal for teams that need automation, scheduling, and field tools.",
    monthlyPrice: 79,
    annualPrice: 59,
    features: [
      "Everything in Starter",
      "AI-Powered SMS Assistant",
      "Route Optimization",
      "Technician Assignment",
      "Role-Based User Permissions",
      "Customer Portal Access",
      "Zapier Hooks + Custom AI Workflows",
      "Document Review & Management",
      "Team & Department Reporting",
    ],
    extraInfo: "Additional Users: $5/user/month",
  },
  pro: {
    title: "Pro",
    description: "Custom solutions for large teams and enterprises.",
    monthlyPrice: 149,
    annualPrice: 119,
    features: [
      "Everything in Growth",
      "Dedicated Account Manager",
      "Custom Integrations",
      "Priority Support",
    ],
  },
};

export default function Pricing({}: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("starter");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showForm, setShowForm] = useState<boolean>(false);

  const priceDisplay = (plan: PlanKey): string =>
    billingCycle === "monthly"
      ? `$${plans[plan].monthlyPrice}/month`
      : `$${plans[plan].annualPrice}/month (billed annually)`;

  const openForm = () => setShowForm(true);
  const closeForm = () => setShowForm(false);

  return (
    <section className="py-16 px-4 max-w-4xl mx-auto" id="pricing">
      <h2 className="text-4xl font-bold text-[#0F1724] text-center">
        Simple Pricing. Scales With Your Business.
      </h2>
      <p className="text-center text-[#6B7280] mt-2 max-w-xl mx-auto">
        No contracts. No hidden fees. Just powerful tools built to grow your service business.
      </p>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-5 py-2 rounded-full border-2 font-medium transition ${
            billingCycle === "monthly"
              ? "!bg-[#0038FF] !text-white !border-[#0038FF]"
              : "bg-white text-[#0F1724] border-gray-300 hover:border-[#0038FF]"
          }`}
        >
          Monthly Billing
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className={`px-5 py-2 rounded-full border-2 font-medium transition ${
            billingCycle === "annual"
              ? "!bg-[#0038FF] !text-white !border-[#0038FF]"
              : "bg-white text-[#0F1724] border-gray-300 hover:border-[#0038FF]"
          }`}
        >
          Annual Billing (Save 25%)
        </button>
      </div>

      {/* Plan Tabs */}
      <div className="flex justify-center gap-6 mt-8 flex-wrap">
        {(Object.keys(plans) as PlanKey[]).map((planKey) => (
          <button
            key={planKey}
            onClick={() => setSelectedPlan(planKey)}
            className={`px-6 py-3 rounded-lg font-semibold text-lg transition ${
              selectedPlan === planKey
                ? "!bg-[#0038FF] !text-white shadow-lg"
                : "bg-gray-100 text-[#0F1724] hover:bg-gray-200"
            }`}
          >
            {plans[planKey].title}
          </button>
        ))}
      </div>

      {/* Selected Plan Details */}
      <div className="mt-10 !bg-white rounded-xl shadow-lg p-8 max-w-lg mx-auto text-left">
        <h3 className="text-2xl font-bold text-[#0F1724]">{plans[selectedPlan].title}</h3>
        <p className="mt-1 text-[#6B7280]">{plans[selectedPlan].description}</p>
        <p className="text-[#0038FF] text-4xl font-extrabold mt-4">{priceDisplay(selectedPlan)}</p>
        <ul className="mt-6 space-y-3 text-[#0F1724]">
          {plans[selectedPlan].features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <FiCheckCircle className="text-[#0038FF] text-lg flex-shrink-0" /> 
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {plans[selectedPlan].extraInfo && (
          <p className="mt-4 text-sm text-[#6B7280]">{plans[selectedPlan].extraInfo}</p>
        )}
        <button onClick={openForm} className="!bg-[#0038FF] !text-white px-6 py-3 rounded-lg shadow hover:opacity-90 transition mt-8 w-full font-semibold">
          Start 7 Day Free Trial
        </button>
      </div>

      {/* Modal for Free Trial Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="!bg-white rounded-lg p-6 max-w-lg w-full relative shadow-lg">
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
    </section>
  );
}