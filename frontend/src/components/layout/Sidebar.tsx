// frontend/src/components/layout/Sidebar.tsx - Modern White & Blue Theme

import { useState } from 'react'
import React from "react";
import { NavLink, useLocation } from 'react-router-dom'
import {
  HomeIcon, UsersIcon, CalendarIcon, ClipboardDocumentListIcon, CurrencyDollarIcon,
  RocketLaunchIcon, CogIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon,
  MapPinIcon, WrenchScrewdriverIcon, DevicePhoneMobileIcon, DocumentTextIcon,
  ChartBarIcon, FunnelIcon, BellIcon, BuildingOfficeIcon, CreditCardIcon,
  UserIcon, ChatBubbleLeftRightIcon, TruckIcon, SignalIcon, Squares2X2Icon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'

type Role = 'admin' | 'technician' | 'customer'

interface NavigationItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavigationItem[]
  badge?: string | number
  roles?: Role[]
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const STAFF: Role[] = ['admin', 'technician']

const navigation: NavigationItem[] = [
  // -------- Back-office (Admin + Technician) --------
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['admin'] },
  {
    name: 'CRM', icon: UsersIcon, roles: ['admin'],
    children: [
      { name: 'Contacts', href: '/crm/contacts', icon: UsersIcon },
      { name: 'Leads', href: '/crm/leads', icon: FunnelIcon },
      { 
        name: 'Service Requests', 
        href: '/crm/service-requests', 
        icon: ClipboardDocumentListIcon,
      },
      {
        name: 'Document Management',
        href: '/admin/documents',
        icon: DocumentTextIcon,
      },
      { name: 'AI Bookings', href: '/admin/ai-bookings', icon: ChatBubbleLeftRightIcon },
      { name: 'Pipeline', href: '/crm/pipeline', icon: ChartBarIcon },
    ]
  },
  {
    name: 'AI Management', icon: RocketLaunchIcon, roles: ['admin'],
    children: [
      { 
        name: 'Service Builder', 
        href: '/admin/service-management', 
        icon: Squares2X2Icon,
        badge: 'Canvas'
      },
    ]
  },
  {
    name: 'Scheduling', icon: CalendarIcon, roles: ['admin'],
    children: [
      { name: 'Calendar', href: '/scheduling/calendar', icon: CalendarIcon },
      { name: 'Job Scheduler', href: '/scheduling/job-scheduler', icon: ClipboardDocumentListIcon },
      { name: 'Route Optimization', href: '/scheduling/route-optimization', icon: MapPinIcon },
    ]
  },
  {
    name: 'Field Service', icon: WrenchScrewdriverIcon, roles: ['admin'],
    children: [
      { name: 'Jobs', href: '/field-service/jobs', icon: ClipboardDocumentListIcon },
      { name: 'Technicians', href: '/field-service/technicians', icon: UsersIcon },
      { name: 'GPS Tracking', href: '/field-service/gps-tracking', icon: MapPinIcon },
      { name: 'Mobile Workflow', href: '/field-service/mobile-workflow', icon: DevicePhoneMobileIcon },
    ]
  },
  {
    name: 'Estimates & Invoicing', icon: CurrencyDollarIcon, roles: ['admin'],
    children: [
      { name: 'Estimates', href: '/estimates', icon: DocumentTextIcon },
      { name: 'Estimate Builder', href: '/estimates/new', icon: DocumentTextIcon },
      { name: 'Invoices', href: '/invoices', icon: CurrencyDollarIcon },
      { name: 'Invoice Generator', href: '/invoices/new', icon: CurrencyDollarIcon },
    ]
  },
  {
    name: 'Settings', icon: CogIcon, roles: ['admin'],
    children: [
      { name: 'Profile', href: '/settings/profile', icon: UserIcon },
      // { name: 'Company', href: '/settings/company', icon: BuildingOfficeIcon },
      { name: 'Integrations', href: '/settings/integrations', icon: RocketLaunchIcon },
    ]
  },

  // -------- Technician Portal (Technician only) --------
  { name: 'Dashboard', href: '/technician-portal/dashboard', icon: HomeIcon, roles: ['technician'] },
  { name: 'My Jobs', href: '/technician-portal/jobs', icon: ClipboardDocumentListIcon, roles: ['technician'] },
  { name: 'Route Optimization', href: '/technician-portal/route', icon: TruckIcon, roles: ['technician'] },
  { name: 'Performance Stats', href: '/technician-portal/stats', icon: ChartBarIcon, roles: ['technician'] },
  { name: 'Settings', href: '/technician-portal/settings', icon: CogIcon, roles: ['technician'] },

  // -------- Customer Portal (Customer only) --------
  {
    name: 'Customer Portal', icon: ChartBarIcon, roles: ['customer'],
    children: [
      { name: 'Dashboard', href: '/customer-portal/dashboard', icon: HomeIcon },
      { name: 'Service History', href: '/customer-portal/service-history', icon: ClipboardDocumentListIcon },
      { name: 'Documents', href: '/customer-portal/documents', icon: DocumentTextIcon },
      { name: 'Payments', href: '/customer-portal/payments', icon: CreditCardIcon },
      { name: 'Payment History', href: '/customer-portal/service-history', icon: CreditCardIcon },
      { name: 'Profile', href: '/customer-portal/profile', icon: UserIcon },
    ]
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuthStore()
  
  // Accordion behavior - only one section expanded at a time
  const [expandedSection, setExpandedSection] = useState<string | null>('CRM')

  const role = (user?.role || '') as Role
  const hasRole = (roles?: Role[]) => !roles?.length || roles.includes(role)

  const isCurrent = (href?: string) =>
    !!href && (location.pathname === href || location.pathname.startsWith(href + '/'))

  const isParentActive = (children?: NavigationItem[]) =>
    !!children?.some(c => isCurrent(c.href))

  const toggle = (name: string) => {
    if (expandedSection === name) {
      setExpandedSection(null)
    } else {
      setExpandedSection(name)
    }
  }

  const isOpenItem = (name: string) => expandedSection === name

  // Auto-expand section when navigating to a page within it
  React.useEffect(() => {
    const currentSection = navigation.find(item => 
      item.children && isParentActive(item.children)
    )
    
    if (currentSection && expandedSection !== currentSection.name) {
      setExpandedSection(currentSection.name)
    }
  }, [location.pathname])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300 ease-in-out" 
            onClick={onClose}
          />
          <div className="relative flex w-full max-w-xs sm:max-w-sm flex-col h-full bg-white shadow-2xl animate-slide-in-left">
            <SidebarContent
              onClose={onClose}
              navigation={navigation}
              hasRole={hasRole}
              isCurrent={isCurrent}
              isParentActive={isParentActive}
              toggle={toggle}
              isOpenItem={isOpenItem}
            />
          </div>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden lg:flex lg:w-64 xl:w-72 2xl:w-80 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 bg-white shadow-lg border-r border-gray-100">
        <SidebarContent
          navigation={navigation}
          hasRole={hasRole}
          isCurrent={isCurrent}
          isParentActive={isParentActive}
          toggle={toggle}
          isOpenItem={isOpenItem}
        />
      </div>
    </>
  )
}

function SidebarContent({
  onClose,
  navigation,
  hasRole,
  isCurrent,
  isParentActive,
  toggle,
  isOpenItem
}: {
  onClose?: () => void
  navigation: NavigationItem[]
  hasRole: (roles?: Role[]) => boolean
  isCurrent: (href?: string) => boolean
  isParentActive: (children?: NavigationItem[]) => boolean
  toggle: (name: string) => void
  isOpenItem: (name: string) => boolean
}) {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - White background to align with logo */}
      <div className="flex-shrink-0 bg-white px-4 sm:px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <img 
              src="/logo.png" 
              alt="Storm AI Logo" 
              className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl flex-shrink-0 shadow-sm"
            />
            <div className="ml-3 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate tracking-tight">
                Storm AI
              </h1>
              <p className="text-xs text-gray-500 font-medium">Service Management</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-400 hover:text-gray-600"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* User info section removed as requested */}

      {/* Navigation - Modern design with blue hover effects */}
      <nav className="flex-1 px-3 sm:px-4 space-y-1 overflow-y-auto pb-4">
        {navigation.map((item) => {
          if (!hasRole(item.roles)) return null

          if (item.children) {
            const active = isParentActive(item.children)
            const open = isOpenItem(item.name)
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => toggle(item.name)}
                  className={`group w-full flex items-center justify-between px-3 py-3 text-sm rounded-xl transition-all duration-200 font-medium
                    ${active 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100'
                    }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                      active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'
                    }`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {open ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-all duration-200" />
                    )}
                  </div>
                </button>

                {/* Submenu with smooth animation */}
                {open && (
                  <div className="ml-2 space-y-1 animate-slide-in-down">
                    {item.children.map((child) => {
                      if (!hasRole(child.roles)) return null
                      return (
                        <NavLink
                          key={child.name}
                          to={child.href!}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `group flex items-center justify-between pl-8 pr-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md border border-blue-700'
                                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100'
                            }`
                          }
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <child.icon className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors duration-200`} />
                            <span className="truncate font-medium">{child.name}</span>
                          </div>
                          {child.badge && (
                            <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                              {child.badge}
                            </span>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.name}
              to={item.href!}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-3 text-sm rounded-xl transition-all duration-200 font-medium border ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md border-blue-700'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-transparent hover:border-blue-100'
                }`
              }
            >
              <div className="flex items-center min-w-0 flex-1">
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200`} />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer - Clean and minimal */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-xs font-medium text-gray-500">Storm AI v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}