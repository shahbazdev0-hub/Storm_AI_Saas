// src/services/customer.service.ts
import api from "./api";

export const CustomerAPI = {
  me: () => api.get("/customer-portal/me").then(r => r.data),
  estimates: () => api.get("/customer-portal/estimates").then(r => r.data),
  invoices: () => api.get("/customer-portal/invoices").then(r => r.data),
  serviceHistory: () => api.get("/customer-portal/service-history").then(r => r.data),
};
