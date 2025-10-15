import React, { useState } from "react";

// Define the form data interface
interface FormData {
  name: string;
  email: string;
  phone: string;
}

// Define the errors interface
interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

// Define props interface
interface FreeTrialFormProps {}

export default function FreeTrialForm({}: FreeTrialFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) {
      errs.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = "Email is invalid";
    }
    if (!formData.phone.trim()) errs.phone = "Phone is required";
    return errs;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      console.log("Submitting form:", formData);
      setSubmitted(true);
      // Here you can add your API call to submit the data
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow text-center">
        <h3 className="text-2xl font-bold text-[#0038FF] mb-4">Thank you!</h3>
        <p className="text-[#0F1724]">Your free trial request has been received. We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white p-6 rounded-lg shadow"
      noValidate
    >
      <h3 className="text-2xl font-bold mb-6 text-[#0F1724] text-center">Start Your 7 Day Free Trial</h3>

      <label className="block mb-4">
        <span className="text-[#0F1724] font-semibold">Name</span>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038FF] ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Your full name"
        />
        {errors.name && <p className="text-red-500 mt-1 text-sm">{errors.name}</p>}
      </label>

      <label className="block mb-4">
        <span className="text-[#0F1724] font-semibold">Email</span>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038FF] ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-red-500 mt-1 text-sm">{errors.email}</p>}
      </label>

      <label className="block mb-6">
        <span className="text-[#0F1724] font-semibold">Phone</span>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038FF] ${
            errors.phone ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="(123) 456-7890"
        />
        {errors.phone && <p className="text-red-500 mt-1 text-sm">{errors.phone}</p>}
      </label>

      <button
        type="submit"
        className="w-full bg-[#0038FF] text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition"
      >
        Start Free Trial
      </button>
    </form>
  );
}