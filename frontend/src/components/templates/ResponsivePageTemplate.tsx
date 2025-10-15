// // src/components/templates/ResponsivePageTemplate.tsx - Responsive Page Templates

// import React from 'react'
// import { cn } from '../../utils/cn'
// import Button from '../ui/Button'
// import { Card, StatsCard, MetricCard, FeatureCard } from '../ui/Card'
// import { DataTable, ResponsiveTable } from '../ui/Table'
// import { Input, SearchInput, Select, FormGroup } from '../ui/Input'
// import { Modal, ConfirmationModal } from '../ui/Modal'

// // Page Layout Template
// interface PageTemplateProps {
//   title: string
//   subtitle?: string
//   actions?: React.ReactNode
//   breadcrumbs?: Array<{ name: string; href?: string }>
//   children: React.ReactNode
//   className?: string
//   fullWidth?: boolean
// }

// export const PageTemplate = ({
//   title,
//   subtitle,
//   actions,
//   breadcrumbs,
//   children,
//   className,
//   fullWidth = false,
// }: PageTemplateProps) => {
//   return (
//     <div className={cn("min-h-full", className)}>
//       {/* Page Header */}
//       <div className="border-b border-gray-200 pb-4 sm:pb-6 mb-6 sm:mb-8">
//         {/* Breadcrumbs */}
//         {breadcrumbs && breadcrumbs.length > 0 && (
//           <nav className="mb-4" aria-label="Breadcrumb">
//             <ol className="flex items-center space-x-1 sm:space-x-2 text-sm">
//               {breadcrumbs.map((crumb, index) => (
//                 <li key={crumb.name} className="flex items-center">
//                   {index > 0 && (
//                     <svg className="h-4 w-4 text-gray-300 mx-1 sm:mx-2" fill="currentColor" viewBox="0 0 20 20">
//                       <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                     </svg>
//                   )}
//                   {crumb.href ? (
//                     <a
//                       href={crumb.href}
//                       className="text-gray-500 hover:text-gray-700 transition-colors"
//                     >
//                       {crumb.name}
//                     </a>
//                   ) : (
//                     <span className="text-gray-900 font-medium">{crumb.name}</span>
//                   )}
//                 </li>
//               ))}
//             </ol>
//           </nav>
//         )}

//         {/* Title and Actions */}
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
//           <div className="min-w-0 flex-1">
//             <h1 className="heading-responsive font-bold text-gray-900 truncate">
//               {title}
//             </h1>
//             {subtitle && (
//               <p className="text-body-responsive text-gray-600 mt-1 sm:mt-2">
//                 {subtitle}
//               </p>
//             )}
//           </div>
          
//           {actions && (
//             <div className="flex-shrink-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
//               {actions}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Page Content */}
//       <div className={cn(
//         fullWidth ? "w-full" : "container-responsive",
//         "space-responsive"
//       )}>
//         {children}
//       </div>
//     </div>
//   )
// }

// // Dashboard Template
// interface DashboardTemplateProps {
//   title: string
//   stats?: Array<{
//     title: string
//     value: string | number
//     change?: number
//     icon: React.ComponentType<{ className?: string }>
//     color?: 'green' | 'blue' | 'purple' | 'orange' | 'red'
//   }>
//   children: React.ReactNode
// }

// export const DashboardTemplate = ({
//   title,
//   stats = [],
//   children,
// }: DashboardTemplateProps) => {
//   return (
//     <PageTemplate title={title}>
//       {/* Stats Grid */}
//       {stats.length > 0 && (
//         <div className="grid-responsive-cards mb-6 sm:mb-8">
//           {stats.map((stat, index) => (
//             <StatsCard
//               key={index}
//               title={stat.title}
//               value={stat.value}
//               change={stat.change}
//               icon={stat.icon}
//               color={stat.color}
//             />
//           ))}
//         </div>
//       )}

//       {/* Dashboard Content */}
//       <div className="space-responsive">
//         {children}
//       </div>
//     </PageTemplate>
//   )
// }

// // List Page Template
// interface ListPageTemplateProps<T = any> {
//   title: string
//   subtitle?: string
//   searchPlaceholder?: string
//   onSearch?: (query: string) => void
//   onAdd?: () => void
//   addButtonText?: string
//   filters?: React.ReactNode
//   columns: Array<{
//     key: string
//     title: string
//     render?: (value: any, record: T, index: number) => React.ReactNode
//     sortable?: boolean
//     hideOnMobile?: boolean
//   }>
//   data: T[]
//   loading?: boolean
//   emptyMessage?: string
//   onRowClick?: (record: T, index: number) => void
//   mobileRenderCard?: (record: T, index: number) => React.ReactNode
// }

// export const ListPageTemplate = <T extends any>({
//   title,
//   subtitle,
//   searchPlaceholder = "Search...",
//   onSearch,
//   onAdd,
//   addButtonText = "Add New",
//   filters,
//   columns,
//   data,
//   loading,
//   emptyMessage,
//   onRowClick,
//   mobileRenderCard,
// }: ListPageTemplateProps<T>) => {
//   return (
//     <PageTemplate
//       title={title}
//       subtitle={subtitle}
//       actions={
//         onAdd && (
//           <Button onClick={onAdd} variant="default">
//             {addButtonText}
//           </Button>
//         )
//       }
//     >
//       {/* Search and Filters */}
//       <Card className="mb-6">
//         <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
//           <div className="flex-1">
//             <SearchInput
//               placeholder={searchPlaceholder}
//               onSearch={onSearch}
//             />
//           </div>
//           {filters && (
//             <div className="flex-shrink-0">
//               {filters}
//             </div>
//           )}
//         </div>
//       </Card>

//       {/* Data Table */}
//       <Card>
//         <ResponsiveTable
//           columns={columns}
//           data={data}
//           loading={loading}
//           emptyMessage={emptyMessage}
//           onRowClick={onRowClick}
//           mobileRenderCard={mobileRenderCard}
//         />
//       </Card>
//     </PageTemplate>
//   )
// }

// // Form Page Template
// interface FormPageTemplateProps {
//   title: string
//   subtitle?: string
//   onSave?: () => void
//   onCancel?: () => void
//   saveButtonText?: string
//   cancelButtonText?: string
//   loading?: boolean
//   children: React.ReactNode
// }

// export const FormPageTemplate = ({
//   title,
//   subtitle,
//   onSave,
//   onCancel,
//   saveButtonText = "Save",
//   cancelButtonText = "Cancel",
//   loading = false,
//   children,
// }: FormPageTemplateProps) => {
//   return (
//     <PageTemplate
//       title={title}
//       subtitle={subtitle}
//     >
//       <Card>
//         <form onSubmit={(e) => { e.preventDefault(); onSave?.(); }}>
//           <div className="space-responsive">
//             {children}
//           </div>

//           {/* Form Actions */}
//           <div className="border-t border-gray-200 pt-6 mt-8">
//             <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
//               {onCancel && (
//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={onCancel}
//                   disabled={loading}
//                   className="w-full sm:w-auto"
//                 >
//                   {cancelButtonText}
//                 </Button>
//               )}
//               <Button
//                 type="submit"
//                 variant="default"
//                 loading={loading}
//                 className="w-full sm:w-auto"
//               >
//                 {saveButtonText}
//               </Button>
//             </div>
//           </div>
//         </form>
//       </Card>
//     </PageTemplate>
//   )
// }

// // Detail Page Template
// interface DetailPageTemplateProps {
//   title: string
//   subtitle?: string
//   onEdit?: () => void
//   onDelete?: () => void
//   onBack?: () => void
//   editButtonText?: string
//   deleteButtonText?: string
//   backButtonText?: string
//   tabs?: Array<{ id: string; name: string; content: React.ReactNode }>
//   activeTab?: string
//   onTabChange?: (tabId: string) => void
//   children: React.ReactNode
// }

// export const DetailPageTemplate = ({
//   title,
//   subtitle,
//   onEdit,
//   onDelete,
//   onBack,
//   editButtonText = "Edit",
//   deleteButtonText = "Delete",
//   backButtonText = "Back",
//   tabs,
//   activeTab,
//   onTabChange,
//   children,
// }: DetailPageTemplateProps) => {
//   return (
//     <PageTemplate
//       title={title}
//       subtitle={subtitle}
//       actions={
//         <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
//           {onBack && (
//             <Button variant="outline" onClick={onBack}>
//               {backButtonText}
//             </Button>
//           )}
//           {onEdit && (
//             <Button variant="default" onClick={onEdit}>
//               {editButtonText}
//             </Button>
//           )}
//           {onDelete && (
//             <Button variant="destructive" onClick={onDelete}>
//               {deleteButtonText}
//             </Button>
//           )}
//         </div>
//       }
//     >
//       {/* Tabs */}
//       {tabs && tabs.length > 0 && (
//         <div className="mb-6">
//           <div className="border-b border-gray-200">
//             <nav className="-mb-px flex space-x-8 overflow-x-auto">
//               {tabs.map((tab) => (
//                 <button
//                   key={tab.id}
//                   onClick={() => onTabChange?.(tab.id)}
//                   className={cn(
//                     "whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm touch-friendly",
//                     activeTab === tab.id
//                       ? "border-primary-500 text-primary-600"
//                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
//                   )}
//                 >
//                   {tab.name}
//                 </button>
//               ))}
//             </nav>
//           </div>
//         </div>
//       )}

//       {/* Tab Content */}
//       {tabs && activeTab ? (
//         <div>
//           {tabs.find(tab => tab.id === activeTab)?.content}
//         </div>
//       ) : (
//         <div className="space-responsive">
//           {children}
//         </div>
//       )}
//     </PageTemplate>
//   )
// }

// // Settings Page Template
// interface SettingsPageTemplateProps {
//   title: string
//   sections: Array<{
//     id: string
//     name: string
//     description?: string
//     content: React.ReactNode
//   }>
//   activeSection?: string
//   onSectionChange?: (sectionId: string) => void
// }

// export const SettingsPageTemplate = ({
//   title,
//   sections,
//   activeSection,
//   onSectionChange,
// }: SettingsPageTemplateProps) => {
//   const currentSection = sections.find(section => section.id === activeSection) || sections[0]

//   return (
//     <PageTemplate title={title}>
//       <div className="flex flex-col lg:flex-row lg:space-x-8 space-y-6 lg:space-y-0">
//         {/* Settings Navigation */}
//         <div className="lg:w-64 flex-shrink-0">
//           <Card className="p-4">
//             <nav className="space-y-1">
//               {sections.map((section) => (
//                 <button
//                   key={section.id}
//                   onClick={() => onSectionChange?.(section.id)}
//                   className={cn(
//                     "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors touch-friendly",
//                     activeSection === section.id
//                       ? "bg-primary-100 text-primary-700"
//                       : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
//                   )}
//                 >
//                   {section.name}
//                 </button>
//               ))}
//             </nav>
//           </Card>
//         </div>

//         {/* Settings Content */}
//         <div className="flex-1 min-w-0">
//           <Card>
//             <div className="border-b border-gray-200 pb-4 mb-6">
//               <h2 className="heading-responsive-sm font-semibold text-gray-900">
//                 {currentSection.name}
//               </h2>
//               {currentSection.description && (
//                 <p className="text-body-responsive text-gray-600 mt-1">
//                   {currentSection.description}
//                 </p>
//               )}
//             </div>
            
//             <div className="space-responsive">
//               {currentSection.content}
//             </div>
//           </Card>
//         </div>
//       </div>
//     </PageTemplate>
//   )
// }

// export default PageTemplate