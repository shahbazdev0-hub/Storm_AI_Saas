// import { useQuery } from '@tanstack/react-query'
// import { Link } from 'react-router-dom'
// import { api } from '../../services/api'

// type Invoice = {
//   id: string
//   invoice_number: string
//   customer_id?: string
//   contact_id?: string
//   title?: string
//   status: string
//   total_amount: number
//   created_at: string
//   due_date?: string
// }

// export default function InvoiceList() {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ['invoices'],
//     queryFn: async () => {
//       const res = await api.get('/invoices/')
//       return res.data
//     }
//   })

//   const invoices: Invoice[] = data?.invoices ?? []

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">Invoices</h1>
//           <p className="text-sm text-gray-500">All invoices you’ve created</p>
//         </div>
//         <Link
//           to="/invoices/new"
//           className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm"
//         >
//           New Invoice
//         </Link>
//       </div>

//       <div className="bg-white rounded-lg shadow overflow-x-auto">
//         {isLoading ? (
//           <div className="p-6">Loading…</div>
//         ) : error ? (
//           <div className="p-6 text-red-600">Failed to load invoices</div>
//         ) : invoices.length === 0 ? (
//           <div className="p-6 text-gray-600">No invoices yet.</div>
//         ) : (
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Invoice #</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Title</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Total</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Created</th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {invoices.map((inv) => (
//                 <tr key={inv.id} className="hover:bg-gray-50">
//                   <td className="px-6 py-4 text-sm font-medium">#{inv.invoice_number}</td>
//                   <td className="px-6 py-4 text-sm">{inv.title || '—'}</td>
//                   <td className="px-6 py-4 text-sm capitalize">{inv.status}</td>
//                   <td className="px-6 py-4 text-sm">
//                     {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(inv.total_amount ?? 0)}
//                   </td>
//                   <td className="px-6 py-4 text-sm">
//                     {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </div>
//   )
// }


















import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'

type Invoice = {
  id: string
  invoice_number: string
  customer_id?: string
  contact_id?: string
  customer_name?: string  // ✅ Add this
  title?: string
  status: string
  total_amount: number
  created_at: string
  due_date?: string
}

export default function InvoiceList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/invoices/')
      return res.data
    }
  })

  const invoices: Invoice[] = data?.invoices ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-gray-500">All invoices you've created</p>
        </div>
        <Link
          to="/invoices/new"
          className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm"
        >
          New Invoice
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {isLoading ? (
          <div className="p-6">Loading…</div>
        ) : error ? (
          <div className="p-6 text-red-600">Failed to load invoices</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-gray-600">No invoices yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Invoice #</th>
                {/* ✅ ADD CUSTOMER COLUMN */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    <Link to={`/invoices/${inv.id}`} className="text-primary-600 hover:text-primary-700">
                      #{inv.invoice_number}
                    </Link>
                  </td>
                  {/* ✅ DISPLAY CUSTOMER NAME */}
                  <td className="px-6 py-4 text-sm">
                    {inv.customer_name || 'Unknown Customer'}
                  </td>
                  <td className="px-6 py-4 text-sm">{inv.title || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                      inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(inv.total_amount ?? 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}