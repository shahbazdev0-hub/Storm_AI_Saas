// Add this component to handle manual invoice generation in your technician portal
// File: frontend/src/components/technician/JobActions.tsx

import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  DocumentTextIcon, 
  PaperAirplaneIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface JobActionsProps {
  job: {
    id: string;
    status: string;
    invoice_created?: boolean;
    invoice_id?: string;
    invoice_number?: string;
  };
  onStatusUpdate: (jobId: string, status: string) => Promise<void>;
  onInvoiceGenerate: (jobId: string) => Promise<any>;
  onInvoiceSend: (jobId: string) => Promise<any>;
}

export const JobActions: React.FC<JobActionsProps> = ({
  job,
  onStatusUpdate,
  onInvoiceGenerate,
  onInvoiceSend
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(`status-${newStatus}`);
    try {
      await onStatusUpdate(job.id, newStatus);
      setMessage({ type: 'success', text: `Job status updated to ${newStatus}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to update status: ${error}` });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateInvoice = async () => {
    setLoading('invoice-generate');
    try {
      const result = await onInvoiceGenerate(job.id);
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Invoice ${result.invoice_number} generated successfully! Payment link ready.` 
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        throw new Error(result.message || 'Invoice generation failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to generate invoice: ${error}` });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(null);
    }
  };

  const handleSendInvoice = async () => {
    setLoading('invoice-send');
    try {
      const result = await onInvoiceSend(job.id);
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Invoice sent to customer at ${result.customer_email}` 
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        throw new Error(result.message || 'Failed to send invoice');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to send invoice: ${error}` });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Update Actions */}
      <div className="flex flex-wrap gap-2">
        {job.status === 'scheduled' && (
          <button
            onClick={() => handleStatusUpdate('in_progress')}
            disabled={loading === 'status-in_progress'}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading === 'status-in_progress' ? 'Starting...' : 'Start Job'}
          </button>
        )}

        {(job.status === 'in_progress' || job.status === 'scheduled') && (
          <button
            onClick={() => handleStatusUpdate('completed')}
            disabled={loading === 'status-completed'}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            {loading === 'status-completed' ? 'Completing...' : 'Complete Job'}
          </button>
        )}
      </div>

      {/* Invoice Actions */}
      {job.status === 'completed' && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Invoice Actions</h4>
          <div className="flex flex-wrap gap-2">
            {!job.invoice_created ? (
              <button
                onClick={handleGenerateInvoice}
                disabled={loading === 'invoice-generate'}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                {loading === 'invoice-generate' ? 'Generating...' : 'Generate Invoice'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Invoice {job.invoice_number} Created
                </span>
                <button
                  onClick={handleSendInvoice}
                  disabled={loading === 'invoice-send'}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  {loading === 'invoice-send' ? 'Sending...' : 'Send to Customer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`rounded-md p-4 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// API service functions to add to your services/api.ts or technician.service.ts

export const technicianAPI = {
  // Update job status
  updateJobStatus: async (jobId: string, status: string, notes?: string) => {
    const response = await fetch(`/api/v1/technician-portal/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status, notes })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update job status');
    }
    
    return response.json();
  },

  // Generate manual invoice
  generateInvoice: async (jobId: string) => {
    const response = await fetch(`/api/v1/technician-portal/jobs/${jobId}/generate-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate invoice');
    }
    
    return response.json();
  },

  // Send invoice to customer
  sendInvoice: async (jobId: string) => {
    const response = await fetch(`/api/v1/technician-portal/jobs/${jobId}/send-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error('Failed to send invoice');
    }
    
    return response.json();
  }
};