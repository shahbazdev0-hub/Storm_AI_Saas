// src/Pages/landing/components/DemoBookingForm.tsx
import React, { useState } from "react";

// Define the form data interface
interface FormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
}

// Define props interface (empty for now, but good practice)
interface DemoBookingFormProps {}

export default function DemoBookingForm({}: DemoBookingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Demo booking details:", formData);
    alert("Your demo request has been submitted!");
    setFormData({ name: "", email: "", phone: "", date: "", time: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        value={formData.name}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded p-2"
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded p-2"
        required
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded p-2"
        required
      />
      <div className="flex gap-2">
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="w-1/2 border border-gray-300 rounded p-2"
          required
        />
        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          className="w-1/2 border border-gray-300 rounded p-2"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-[#0038FF] text-white py-2 rounded hover:bg-[#0038FF]/90"
      >
        Submit
      </button>
    </form>
  );
}