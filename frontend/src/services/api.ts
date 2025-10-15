
// frontend/src/services/api.ts - COMPLETE VERSION WITH CUSTOMER PORTAL FALLBACK
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

/** Join URL parts safely */
const join = (...parts: (string | undefined)[]) =>
  parts
    .filter(Boolean)
    .map(p => String(p).replace(/(^\/+|\/+$)/g, ''))
    .join('/')

/**
 * ENV Configuration:
 *  VITE_API_URL      = http://localhost:8000 (your backend URL)
 *  VITE_API_PREFIX   = api/v1   (API prefix, leave empty for root)
 *  VITE_API_MOCK     = false    (disable mock mode)
 *  VITE_USE_FALLBACK = true     (enable fallback data when backend is down)
 */
// Add this export near the bottom of your api.ts file
export const getStaticAssetUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  return `${baseUrl}${path}`
}

export const MOCK = String(import.meta.env.VITE_API_MOCK).toLowerCase() === 'true'
export const USE_FALLBACK = false
export const technicianAPI = {
  
  // Update job status
  updateJobStatus: async (jobId: string, status: string, notes?: string) => {
    const response = await api.patch(`/technician-portal/jobs/${jobId}/status`, {
      status,
      notes
    })
    return response.data
  },

  // Generate manual invoice
  generateInvoice: async (jobId: string) => {
    const response = await api.post(`/technician-portal/jobs/${jobId}/generate-invoice`, {})
    return response.data
  },

  // Send invoice to customer
  sendInvoice: async (jobId: string) => {
    const response = await api.post(`/technician-portal/jobs/${jobId}/send-invoice`, {})
    return response.data
  }
}
const API_BASE = (() => {
  const root = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const prefix = import.meta.env.VITE_API_PREFIX ?? 'api/v1'
  return prefix ? `${root}/${prefix}` : root
})()

const API_CONFIG = {
  baseURL: API_BASE,
  timeout: 30000, // Increased timeout to 10 seconds
  headers: { 'Content-Type': 'application/json' },
}

export const api: AxiosInstance = axios.create(API_CONFIG)

/* ------------------------------ FALLBACK DATA ------------------------------ */
const FALLBACK_DATA = {
  // Add this to the FALLBACK_DATA object in your api.ts file
// Add this to your FALLBACK_DATA object in frontend/src/services/api.ts
// Add to your existing FALLBACK_DATA:
'documents': {
  documents: [],
  total: 0,
  page: 1,
  size: 100,
  pages: 0,
  document_types: ['id_card', 'agreement', 'contract'],
  message: "Admin documents fallback data"
},

'customers': {
  customers: [],
  total: 0,
  message: "Customers fallback data"
},
'service-requests': {
  service_requests: [
    {
      id: 'sr_1',
      request_number: 'SR-20250829-001',
      customer_name: 'John Smith',
      customer_email: 'john.smith@example.com',
      service_type: 'HVAC Repair',
      description: 'Air conditioning not cooling properly, needs immediate attention',
      location: '123 Main Street, Los Angeles, CA 90210',
      priority: 'high',
      status: 'pending',
      preferred_date: '2025-08-30',
      preferred_time: 'morning',
      contact_phone: '+1-555-0123',
      special_instructions: 'Please call before arrival, customer has small children',
      admin_notes: null,
      estimated_cost: null,
      estimated_duration: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: {
        id: 'cust_1',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0123'
      }
    },
    {
      id: 'sr_2',
      request_number: 'SR-20250829-002',
      customer_name: 'Maria Garcia',
      customer_email: 'maria.garcia@example.com',
      service_type: 'Plumbing Emergency',
      description: 'Kitchen sink is completely blocked and overflowing, urgent help needed',
      location: '456 Oak Avenue, Los Angeles, CA 90230',
      priority: 'urgent',
      status: 'assigned',
      preferred_date: '2025-08-29',
      preferred_time: 'afternoon',
      contact_phone: '+1-555-4567',
      special_instructions: 'Emergency situation, customer will be home all day',
      admin_notes: 'Assigned to Mike Johnson, scheduled for 2:00 PM today',
      estimated_cost: 350,
      estimated_duration: 120,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updated_at: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      customer: {
        id: 'cust_2',
        name: 'Maria Garcia',
        email: 'maria.garcia@example.com',
        phone: '+1-555-4567'
      },
      assigned_user: {
        id: 'user_1',
        name: 'Mike Johnson',
        email: 'mike.johnson@company.com'
      }
    },
    {
      id: 'sr_3',
      request_number: 'SR-20250828-003',
      customer_name: 'Robert Davis',
      customer_email: 'robert.davis@example.com',
      service_type: 'Electrical Work',
      description: 'Need to install new outlet in home office and check electrical panel',
      location: '789 Pine Street, Los Angeles, CA 90290',
      priority: 'medium',
      status: 'completed',
      preferred_date: '2025-08-28',
      preferred_time: 'morning',
      contact_phone: '+1-555-7890',
      special_instructions: 'Customer works from home, please be quiet during calls',
      admin_notes: 'Work completed successfully, customer very satisfied. Invoice sent.',
      estimated_cost: 285,
      estimated_duration: 90,
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      customer: {
        id: 'cust_3',
        name: 'Robert Davis',
        email: 'robert.davis@example.com',
        phone: '+1-555-7890'
      },
      assigned_user: {
        id: 'user_2',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@company.com'
      }
    },
    {
      id: 'sr_4',
      request_number: 'SR-20250827-004',
      customer_name: 'Lisa Chen',
      customer_email: 'lisa.chen@example.com',
      service_type: 'General Maintenance',
      description: 'Annual HVAC maintenance check, replace filters and inspect system',
      location: '321 Maple Drive, Los Angeles, CA 90210',
      priority: 'low',
      status: 'in_progress',
      preferred_date: '2025-08-30',
      preferred_time: 'afternoon',
      contact_phone: '+1-555-3210',
      special_instructions: 'Regular maintenance customer, has service agreement',
      admin_notes: 'Technician on route, ETA 20 minutes',
      estimated_cost: 150,
      estimated_duration: 60,
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      customer: {
        id: 'cust_4',
        name: 'Lisa Chen',
        email: 'lisa.chen@example.com',
        phone: '+1-555-3210'
      },
      assigned_user: {
        id: 'user_3',
        name: 'Tom Martinez',
        email: 'tom.martinez@company.com'
      }
    },
    {
      id: 'sr_5',
      request_number: 'SR-20250827-005',
      customer_name: 'David Wilson',
      customer_email: 'david.wilson@example.com',
      service_type: 'HVAC Installation',
      description: 'Need quote for new central air system installation in 2-story home',
      location: '654 Elm Street, Los Angeles, CA 90250',
      priority: 'medium',
      status: 'converted_to_lead',
      preferred_date: '2025-09-05',
      preferred_time: 'morning',
      contact_phone: '+1-555-6540',
      special_instructions: 'Customer wants detailed quote before proceeding',
      admin_notes: 'Converted to sales lead, estimate scheduled for next week',
      estimated_cost: 5500,
      estimated_duration: 480,
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      customer: {
        id: 'cust_5',
        name: 'David Wilson',
        email: 'david.wilson@example.com',
        phone: '+1-555-6540'
      }
    }
  ],
  total: 5,
  page: 1,
  per_page: 20,
  has_next: false,
  has_prev: false
},

'service-requests/stats/overview': {
  total_requests: 5,
  pending_requests: 1,
  assigned_requests: 1,
  completed_requests: 1,
  recent_requests: 2,
  completion_rate: 60.0,
  priority_breakdown: {
    low: 1,
    medium: 2,
    high: 1,
    urgent: 1
  },
  status_breakdown: {
    pending: 1,
    assigned: 1,
    in_progress: 1,
    completed: 1,
    converted_to_lead: 1
  }
},

'service-requests/debug': {
  message: 'Service requests debug endpoint working',
  user: {
    id: 'user_admin_1',
    email: 'admin@company.com',
    company_id: 'company_1'
  },
  database_stats: {
    total_requests_for_company: 5,
    total_requests_all_companies: 5,
    sample_requests: [
      {
        id: 'sr_1',
        company_id: 'company_1',
        customer_name: 'John Smith',
        service_type: 'HVAC Repair',
        status: 'pending',
        created_at: new Date().toISOString()
      },
      {
        id: 'sr_2',
        company_id: 'company_1',
        customer_name: 'Maria Garcia',
        service_type: 'Plumbing Emergency',
        status: 'assigned',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  }
},
// Technician Portal Fallback Data
'technician-portal/dashboard': {
  technician: {
    id: 'tech_1',
    name: 'Michael Johnson',
    phone: '+1-555-7890',
    status: 'active'
  },
  today_jobs: [
    {
      id: 'job_1',
      job_number: 'JOB-2025-001',
      title: 'AC Maintenance',
      service_type: 'hvac_maintenance',
      description: 'Annual maintenance and filter replacement',
      status: 'scheduled',
      priority: 'medium',
      customer: {
        name: 'John Smith',
        phone: '+1-555-0123',
        address: '123 Main St, Los Angeles, CA 90210'
      },
      scheduled_start: new Date().toISOString().split('T')[0] + 'T09:00:00',
      scheduled_end: new Date().toISOString().split('T')[0] + 'T11:00:00',
      estimated_duration: 120,
      special_instructions: 'Customer has a dog, please call before arrival',
      equipment_needed: ['Filter replacements', 'Cleaning supplies', 'Diagnostic tools']
    },
    {
      id: 'job_2',
      job_number: 'JOB-2025-002',
      title: 'Plumbing Repair',
      service_type: 'plumbing',
      description: 'Fix leaking pipe under kitchen sink',
      status: 'confirmed',
      priority: 'high',
      customer: {
        name: 'Jane Williams',
        phone: '+1-555-4567',
        address: '456 Oak Ave, Los Angeles, CA 90230'
      },
      scheduled_start: new Date().toISOString().split('T')[0] + 'T13:00:00',
      scheduled_end: new Date().toISOString().split('T')[0] + 'T14:30:00',
      estimated_duration: 90,
      special_instructions: '',
      equipment_needed: ['Pipe wrench', 'Replacement parts', 'Sealant']
    },
    {
      id: 'job_3',
      job_number: 'JOB-2025-003',
      title: 'Electrical Inspection',
      service_type: 'electrical',
      description: 'Inspect and repair faulty outlet in living room',
      status: 'scheduled',
      priority: 'medium',
      customer: {
        name: 'Robert Davis',
        phone: '+1-555-8901',
        address: '789 Pine St, Los Angeles, CA 90290'
      },
      scheduled_start: new Date().toISOString().split('T')[0] + 'T16:00:00',
      scheduled_end: new Date().toISOString().split('T')[0] + 'T17:00:00',
      estimated_duration: 60,
      special_instructions: 'Customer will not be home, key under mat',
      equipment_needed: ['Voltage tester', 'Replacement outlets', 'Wire cutters']
    }
  ],
  stats: {
    today_total: 3,
    week_stats: {
      completed: 12,
      in_progress: 1,
      scheduled: 5,
      cancelled: 2
    },
    total_this_week: 20
  },
  notifications: [
    {
      id: 'tech_notif_1',
      title: 'Job Assignment',
      message: 'You have been assigned a new job for tomorrow',
      type: 'info',
      time: '10 minutes ago'
    },
    {
      id: 'tech_notif_2',
      title: 'Schedule Change',
      message: 'Job #JOB-2025-004 has been rescheduled to tomorrow',
      type: 'warning',
      time: '1 hour ago'
    }
  ]
},

'technician-portal/jobs': {
  jobs: [
    {
      id: 'job_1',
      job_number: 'JOB-2025-001',
      title: 'AC Maintenance',
      service_type: 'hvac_maintenance',
      description: 'Annual maintenance and filter replacement',
      status: 'scheduled',
      priority: 'medium',
      customer: {
        name: 'John Smith',
        phone: '+1-555-0123',
        email: 'john.smith@example.com'
      },
      location: {
        street: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        latitude: 34.0522,
        longitude: -118.2437
      },
      time_tracking: {
        scheduled_start: new Date().toISOString().split('T')[0] + 'T09:00:00',
        scheduled_end: new Date().toISOString().split('T')[0] + 'T11:00:00',
        scheduled_duration: 120,
        actual_start: null,
        actual_end: null,
        actual_duration: null
      },
      special_instructions: 'Customer has a dog, please call before arrival',
      equipment_needed: ['Filter replacements', 'Cleaning supplies', 'Diagnostic tools'],
      safety_requirements: ['Gloves'],
      photos: [],
      notes: []
    },
    {
      id: 'job_2',
      job_number: 'JOB-2025-002',
      title: 'Plumbing Repair',
      service_type: 'plumbing',
      description: 'Fix leaking pipe under kitchen sink',
      status: 'confirmed',
      priority: 'high',
      customer: {
        name: 'Jane Williams',
        phone: '+1-555-4567',
        email: 'jane.williams@example.com'
      },
      location: {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90230',
        latitude: 34.0224,
        longitude: -118.4912
      },
      time_tracking: {
        scheduled_start: new Date().toISOString().split('T')[0] + 'T13:00:00',
        scheduled_end: new Date().toISOString().split('T')[0] + 'T14:30:00',
        scheduled_duration: 90,
        actual_start: null,
        actual_end: null,
        actual_duration: null
      },
      special_instructions: '',
      equipment_needed: ['Pipe wrench', 'Replacement parts', 'Sealant'],
      safety_requirements: ['Gloves', 'Safety glasses'],
      photos: [],
      notes: []
    },
    {
      id: 'job_comp_1',
      job_number: 'JOB-2025-000',
      title: 'HVAC Repair',
      service_type: 'hvac_repair',
      description: 'Repair AC unit not cooling properly',
      status: 'completed',
      priority: 'high',
      customer: {
        name: 'David Brown',
        phone: '+1-555-3344',
        email: 'david.brown@example.com'
      },
      location: {
        street: '555 Maple Dr',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90001',
        latitude: 33.9731,
        longitude: -118.2479
      },
      time_tracking: {
        scheduled_start: new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T10:00:00',
        scheduled_end: new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T12:00:00',
        scheduled_duration: 120,
        actual_start: new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T10:15:00',
        actual_end: new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T11:45:00',
        actual_duration: 90
      },
      special_instructions: '',
      equipment_needed: ['Refrigerant', 'Pressure gauge', 'Multimeter'],
      safety_requirements: ['Gloves'],
      photos: [
        {
          id: 'photo_1',
          category: 'before',
          url: 'https://via.placeholder.com/300x200',
          description: 'AC unit before repair'
        },
        {
          id: 'photo_2',
          category: 'after',
          url: 'https://via.placeholder.com/300x200',
          description: 'AC unit after repair'
        }
      ],
      notes: [
        {
          id: 'note_1',
          content: 'Diagnosed refrigerant leak, refilled and sealed.',
          note_type: 'general',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          is_customer_visible: true
        }
      ]
    }
  ],
  total: 3,
  filters: {
    date: 'today',
    status: 'all'
  }
},

'technician-portal/jobs/job_1': {
  id: 'job_1',
  job_number: 'JOB-2025-001',
  title: 'AC Maintenance',
  description: 'Annual maintenance and filter replacement',
  service_type: 'hvac_maintenance',
  status: 'scheduled',
  priority: 'medium',
  customer: {
    id: 'cust_1',
    name: 'John Smith',
    phone: '+1-555-0123',
    email: 'john.smith@example.com',
    company: null
  },
  location: {
    street: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90210',
    access_instructions: 'Ring doorbell upon arrival',
    gate_code: '',
    key_location: '',
    parking_instructions: 'Street parking available',
    latitude: 34.0522,
    longitude: -118.2437
  },
  time_tracking: {
    scheduled_start: new Date().toISOString().split('T')[0] + 'T09:00:00',
    scheduled_end: new Date().toISOString().split('T')[0] + 'T11:00:00',
    scheduled_duration: 120,
    actual_start: null,
    actual_end: null,
    actual_duration: null,
    break_start: null,
    break_end: null,
    break_duration: null
  },
  service_details: {
    special_instructions: 'Customer has a dog, please call before arrival',
    equipment_needed: ['Filter replacements', 'Cleaning supplies', 'Diagnostic tools'],
    safety_requirements: ['Gloves'],
    service_areas: ['Living room', 'Hallway']
  },
  materials: [],
  photos: [],
  notes: [
    {
      id: 'note_1',
      content: 'Customer requested that we also check the thermostat',
      note_type: 'general',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      is_customer_visible: true
    }
  ],
  completion: null,
  estimate: null,
  timestamps: {
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
},

'technician-portal/route-optimization': {
  date: new Date().toISOString().split('T')[0],
  total_jobs: 3,
  estimated_total_time: 270,
  estimated_travel_time: 45,
  route: [
    {
      id: 'job_1',
      job_number: 'JOB-2025-001',
      title: 'AC Maintenance',
      service_type: 'hvac_maintenance',
      status: 'scheduled',
      priority: 'medium',
      customer: {
        name: 'John Smith',
        phone: '+1-555-0123'
      },
      location: {
        full_address: '123 Main St, Los Angeles, CA 90210',
        latitude: 34.0522,
        longitude: -118.2437
      },
      time_window: {
        scheduled_start: new Date().toISOString().split('T')[0] + 'T09:00:00',
        scheduled_end: new Date().toISOString().split('T')[0] + 'T11:00:00',
        estimated_duration: 120
      },
      special_instructions: 'Customer has a dog, please call before arrival',
      access_instructions: 'Ring doorbell upon arrival',
      route_order: 1,
      estimated_travel_time: 0
    },
    {
      id: 'job_2',
      job_number: 'JOB-2025-002',
      title: 'Plumbing Repair',
      service_type: 'plumbing',
      status: 'confirmed',
      priority: 'high',
      customer: {
        name: 'Jane Williams',
        phone: '+1-555-4567'
      },
      location: {
        full_address: '456 Oak Ave, Los Angeles, CA 90230',
        latitude: 34.0224,
        longitude: -118.4912
      },
      time_window: {
        scheduled_start: new Date().toISOString().split('T')[0] + 'T13:00:00',
        scheduled_end: new Date().toISOString().split('T')[0] + 'T14:30:00',
        estimated_duration: 90
      },
      special_instructions: '',
      access_instructions: '',
      route_order: 2,
      estimated_travel_time: 25
    },
    {
      id: 'job_3',
      job_number: 'JOB-2025-003',
      title: 'Electrical Inspection',
      service_type: 'electrical',
      status: 'scheduled',
      priority: 'medium',
      customer: {
        name: 'Robert Davis',
        phone: '+1-555-8901'
      },
      location: {
        full_address: '789 Pine St, Los Angeles, CA 90290',
        latitude: 34.0823,
        longitude: -118.4228
      },
      time_window: {
        scheduled_start: new Date().toISOString().split('T')[0] + 'T16:00:00',
        scheduled_end: new Date().toISOString().split('T')[0] + 'T17:00:00',
        estimated_duration: 60
      },
      special_instructions: 'Customer will not be home, key under mat',
      access_instructions: 'Key under mat',
      route_order: 3,
      estimated_travel_time: 20
    }
  ]
},

'technician-portal/stats': {
  period: 'week',
  date_range: {
    start: new Date(Date.now() - 7 * 86400000).toISOString(),
    end: new Date().toISOString()
  },
  jobs: {
    total: 20,
    completed: 12,
    in_progress: 1,
    scheduled: 5,
    cancelled: 2
  },
  time: {
    total_hours: 36.5,
    avg_job_duration: 75.2,
    efficiency_score: 92.8
  },
  revenue: {
    total: 4250.75,
    avg_per_job: 354.23
  }
},
  'dashboard/stats': {
    monthly_revenue: 47500,
    revenue_change: 12.5,
    active_leads: 23,
    leads_change: 8.2,
    total_customers: 340,
    customers_change: 5.1,
    weekly_jobs: 12,
    jobs_change: -2.3,
    revenue_data: [
      { month: 'Jan', revenue: 35000, target: 45000 },
      { month: 'Feb', revenue: 42000, target: 45000 },
      { month: 'Mar', revenue: 38000, target: 45000 },
      { month: 'Apr', revenue: 47500, target: 45000 },
    ]
  },
  'dashboard/recent-activity': [
    {
      id: '1',
      description: 'New lead from website contact form',
      time: '2 minutes ago',
      type: 'lead'
    },
    {
      id: '2',
      description: 'Job completed for John Smith - AC Repair',
      time: '15 minutes ago',
      type: 'job'
    },
    {
      id: '3',
      description: 'Payment received for Invoice #1234',
      time: '1 hour ago',
      type: 'payment'
    },
    {
      id: '4',
      description: 'New appointment scheduled for tomorrow',
      time: '2 hours ago',
      type: 'appointment'
    }
  ],
  'contacts': [],
  'leads': [
    {
      id: 'fallback_lead_1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      status: 'new',
      source: 'website',
      estimated_value: 2500,
      priority: 3,
      ai_score: 0.75,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: 'Interested in HVAC service',
      tags: ['hvac', 'residential'],
      company_id: 'demo-company-1',
      created_by: 'demo-user-1'
    },
    {
      id: 'fallback_lead_2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1-555-0124',
      status: 'contacted',
      source: 'referral',
      estimated_value: 3500,
      priority: 4,
      ai_score: 0.85,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      notes: 'Commercial plumbing project',
      tags: ['plumbing', 'commercial'],
      company_id: 'demo-company-1',
      created_by: 'demo-user-1'
    }
  ],
  'notifications': [
    {
      id: 'n_1',
      title: 'New lead assigned',
      message: 'You have been assigned a new lead from the website.',
      type: 'info',
      created_at: new Date().toISOString(),
      read: false,
    },
    {
      id: 'n_2',
      title: 'Job completed',
      message: 'AC repair job for John Smith has been completed.',
      type: 'success',
      created_at: new Date().toISOString(),
      read: false,
    }
  ],
  // ✅ CUSTOMER PORTAL FALLBACK DATA
  'customer-portal/dashboard': {
    customer: {
      id: '1',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '+1-555-0123',
      address: '123 Main Street',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90210',
      customer_since: '2023-01-15T00:00:00.000Z',
      preferred_contact_method: 'email'
    },
    upcoming_appointments: [
      {
        id: 'appt_1',
        service_type: 'AC Maintenance',
        scheduled_date: '2025-09-05',
        start_time: '09:00',
        end_time: '11:00',
        technician_name: 'Mike Johnson',
        technician_phone: '+1-555-0456',
        status: 'confirmed',
        special_instructions: 'Please check all ducts and replace filters'
      },
      {
        id: 'appt_2',
        service_type: 'Plumbing Inspection',
        scheduled_date: '2025-09-12',
        start_time: '14:00',
        end_time: '16:00',
        technician_name: 'Sarah Davis',
        technician_phone: '+1-555-0789',
        status: 'pending',
        special_instructions: null
      }
    ],
    recent_services: [
      {
        id: 'service_1',
        service_type: 'HVAC Repair',
        completion_date: '2025-08-15',
        technician_name: 'Mike Johnson',
        rating: 5,
        notes: 'Excellent service, very professional and thorough',
        photos: ['https://via.placeholder.com/300x200', 'https://via.placeholder.com/300x200']
      },
      {
        id: 'service_2',
        service_type: 'Electrical Work',
        completion_date: '2025-07-22',
        technician_name: 'Tom Wilson',
        rating: 4,
        notes: 'Good work, fixed the wiring issue quickly',
        photos: []
      },
      {
        id: 'service_3',
        service_type: 'Plumbing Repair',
        completion_date: '2025-06-10',
        technician_name: 'Sarah Davis',
        rating: 5,
        notes: 'Fixed the leak perfectly, very clean work',
        photos: ['https://via.placeholder.com/300x200']
      }
    ],
    outstanding_invoices: [
      {
        id: 'inv_1',
        invoice_number: 'INV-2025-001',
        service_date: '2025-08-15',
        amount: 285.50,
        due_date: '2025-09-15',
        status: 'sent'
      },
      {
        id: 'inv_2',
        invoice_number: 'INV-2025-002',
        service_date: '2025-07-22',
        amount: 150.00,
        due_date: '2025-09-01',
        status: 'overdue'
      }
    ],
    service_agreement: {
      plan_name: 'Premium Maintenance Plan',
      next_service_date: '2025-09-05',
      services_included: [
        'Bi-annual HVAC maintenance',
        'Priority scheduling',
        '10% discount on repairs',
        'Free filter replacements'
      ],
      annual_savings: 450.00
    },
    notifications: [
      {
        id: 'notif_1',
        title: 'Upcoming Service Reminder',
        message: 'Your AC maintenance is scheduled for September 5th at 9:00 AM',
        type: 'info',
        created_at: '2025-08-25T10:00:00.000Z',
        read: false
      },
      {
        id: 'notif_2',
        title: 'Invoice Due Soon',
        message: 'Invoice INV-2025-001 is due on September 15th',
        type: 'warning',
        created_at: '2025-08-20T14:30:00.000Z',
        read: false
      },
      {
        id: 'notif_3',
        title: 'Service Completed',
        message: 'Your HVAC repair has been completed. Please rate your experience.',
        type: 'success',
        created_at: '2025-08-15T16:45:00.000Z',
        read: true
      }
    ],
    satisfaction_scores: {
      overall_rating: 4.7,
      service_quality: 4.8,
      technician_professionalism: 4.9,
      value_for_money: 4.5,
      total_reviews: 12
    }
  },
  'analytics/overview': {
    overview: {
      total_revenue: 125000,
      revenue_change: 12.5,
      total_leads: 156,
      leads_change: 8.2,
      conversion_rate: 15.3,
      conversion_change: 2.1,
      avg_deal_size: 2800,
      deal_size_change: 5.7
    },
    revenue_trend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      revenue: 3000 + Math.random() * 2000,
      target: 4000
    })),
    lead_sources: [
      { source: 'Website', count: 45, value: 112500 },
      { source: 'Referrals', count: 32, value: 96000 },
      { source: 'Google Ads', count: 28, value: 84000 },
      { source: 'Facebook', count: 18, value: 54000 },
    ],
    conversion_funnel: [
      { stage: 'Leads', count: 156, percentage: 100 },
      { stage: 'Qualified', count: 89, percentage: 57 },
      { stage: 'Proposal', count: 45, percentage: 29 },
      { stage: 'Closed Won', count: 23, percentage: 15 }
    ],
    top_services: [
      { service: 'AC Repair', revenue: 45000, count: 89 },
      { service: 'Plumbing', revenue: 38000, count: 76 },
      { service: 'Electrical', revenue: 32000, count: 54 }
    ],
    monthly_performance: Array.from({ length: 6 }, (_, i) => ({
      month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenue: 20000 + Math.random() * 15000,
      leads: 25 + Math.floor(Math.random() * 20),
      conversions: 8 + Math.floor(Math.random() * 10)
    }))
  },
  'reports/recent': []
}

// Check if backend is available
let backendAvailable = true
let lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL = 60000 // 1 minute

async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now()
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return backendAvailable
  }

  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/health`, {
      timeout: 3000 // Quick health check
    })
    backendAvailable = response.status === 200
    lastHealthCheck = now
    return backendAvailable
  } catch {
    backendAvailable = false
    lastHealthCheck = now
    return false
  }
}

/* --------------------------- REQUEST INTERCEPTOR --------------------------- */
api.interceptors.request.use(
  async (config: AxiosRequestConfig & { metadata?: { startTime?: Date } }) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
    }
    config.metadata = { startTime: new Date() }

    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        data: config.data,
        params: config.params,
      })
    }

    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

/* --------------------------- RESPONSE INTERCEPTOR --------------------------- */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const end = new Date()
    const start = (response.config as any).metadata?.startTime as Date | undefined
    const duration = start ? `${end.getTime() - start.getTime()}ms` : '—'
    
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url}`, {
        status: response.status,
        duration,
        data: response.data,
      })
    }
    return response
  },
  async (error: AxiosError & { config?: any }) => {
    const { response, config } = error
    const end = new Date()
    const start = config?.metadata?.startTime as Date | undefined
    const duration = start ? `${end.getTime() - start.getTime()}ms` : '—'

    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${config?.method?.toUpperCase()} ${config?.baseURL}${config?.url}`, {
        status: response?.status,
        duration,
        error: response?.data || error.message,
      })
    }

    // Handle fallback for failed requests
    if (USE_FALLBACK && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !response || response.status >= 500 || response.status === 404)) {
      const url = (config?.url || '').replace(/^\//, '')
      
      // Try to match fallback data more flexibly
      let fallbackKey = Object.keys(FALLBACK_DATA).find(key => {
        // Handle query parameters
        const cleanUrl = url.split('?')[0]
        return cleanUrl.includes(key) || key.includes(cleanUrl) || cleanUrl === key
      })
      
      if (fallbackKey) {
        console.log(`🔄 Fallback activated for: ${url} -> ${fallbackKey}`)
        backendAvailable = false
        
        // Show user-friendly message only once
        if (!document.querySelector('[data-fallback-notified]')) {
          toast('Using demo data - backend unavailable', {
            icon: '⚡',
            duration: 3000,
            id: 'fallback-notification'
          })
          // Mark that we've shown the notification
          const marker = document.createElement('div')
          marker.setAttribute('data-fallback-notified', 'true')
          marker.style.display = 'none'
          document.body.appendChild(marker)
        }
        
        return Promise.resolve({
          data: FALLBACK_DATA[fallbackKey as keyof typeof FALLBACK_DATA],
          status: 200,
          statusText: 'OK (Fallback)',
          headers: {},
          config,
          request: {}
        } as AxiosResponse)
      }
    }

    if (response) {
      const { status, data }: any = response
      switch (status) {
        case 401:
          useAuthStore.getState().logout()
          toast.error('Session expired. Please login again.')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403: 
          toast.error("You don't have permission to perform this action.")
          break
        case 404: 
          // Don't show toast for 404s on API endpoints - they might be expected
          console.warn(`404 Error - Endpoint may not exist: ${config?.method?.toUpperCase()} ${config?.url}`)
          break
        // In your existing response interceptor error handling, add:
        case 413: // Payload too large
          toast.error('File too large. Please upload a file smaller than 50MB.')
          break
        case 415: // Unsupported media type  
          toast.error('File type not supported. Please upload a valid document.')
          break
        case 422:
          const validationMessage = typeof data?.detail === 'string' ? data.detail : 
                                  data?.detail?.[0]?.msg || 'Validation error occurred.'
          toast.error(validationMessage)
          break
        case 429: 
          toast.error('Too many requests. Please try again later.')
          break
        case 500: 
        case 502: 
        case 503: 
        case 504:
          // Don't show error toast for 500 errors if fallback is enabled
          if (!USE_FALLBACK) {
            toast.error('Server error. Please try again later.')
          }
          break
        default:
          if (!USE_FALLBACK) {
            toast.error(data?.detail || data?.message || 'An unexpected error occurred.')
          }
      }
    } else if (error.code === 'ECONNABORTED') {
      // Don't show timeout toasts for fallback-enabled endpoints
      if (!USE_FALLBACK) {
        toast.error('Request timeout. Please check your connection.')
      }
    } else if (error.code === 'ERR_NETWORK') {
      // Only show network error once and only if fallback is disabled
      if (!USE_FALLBACK && !document.querySelector('[data-network-error-shown]')) {
        toast.error('Cannot connect to server. Please check your connection.', {
          duration: 5000,
          id: 'network-error'
        })
        // Mark that we've shown the error
        const marker = document.createElement('div')
        marker.setAttribute('data-network-error-shown', 'true')
        marker.style.display = 'none'
        document.body.appendChild(marker)
      }
    }
    
    return Promise.reject(error)
  }
)

/* ------------------------------- UTIL TYPES ------------------------------- */
export interface ApiResponse<T = any> { 
  data: T
  message?: string
  success: boolean 
}

export const apiUtils = {
  isNetworkError: (e: any) => !e.response && (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || e.message === 'Network Error'),
  isServerError: (e: any) => e.response && e.response.status >= 500,
  isClientError: (e: any) => e.response && e.response.status >= 400 && e.response.status < 500,
  isUsingFallback: () => !backendAvailable && USE_FALLBACK,
}

export const healthCheck = async (): Promise<boolean> => {
  return await checkBackendHealth()
}

// Backend connection test utility
export const testBackendConnection = async (): Promise<{
  connected: boolean
  baseUrl: string
  error?: string
}> => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/health`, {
      timeout: 5000
    })
    backendAvailable = true
    return {
      connected: true,
      baseUrl: API_BASE,
    }
  } catch (error: any) {
    backendAvailable = false
    return {
      connected: false,
      baseUrl: API_BASE,
      error: error.message || 'Connection failed'
    }
  }
}

export default api



