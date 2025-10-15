// src/components/ui/Modal.tsx - FIXED VERSION WITH Z-INDEX

import React, { Fragment, forwardRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

// Modal variants
const modalVariants = cva(
  "relative transform overflow-hidden bg-white text-left shadow-xl transition-all",
  {
    variants: {
      size: {
        xs: "w-full max-w-xs sm:max-w-sm",
        sm: "w-full max-w-sm sm:max-w-md",
        md: "w-full max-w-md sm:max-w-lg",
        lg: "w-full max-w-lg sm:max-w-2xl",
        xl: "w-full max-w-xl sm:max-w-4xl",
        "2xl": "w-full max-w-2xl sm:max-w-6xl",
        full: "w-full max-w-full mx-4 sm:mx-8",
      },
      position: {
        center: "my-8 align-middle",
        top: "mt-8 mb-auto align-top",
        bottom: "mb-8 mt-auto align-bottom",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
      },
    },
    defaultVariants: {
      size: "md",
      position: "center",
      rounded: "lg",
    },
  }
)

// Modal interfaces
export interface ModalProps
  extends VariantProps<typeof modalVariants> {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  closeButton?: boolean
  closeOnOverlay?: boolean
  className?: string
  overlayClassName?: string
  fullScreen?: boolean
}

export interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

export interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

// Base Modal Component
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    isOpen, 
    onClose, 
    title, 
    description,
    children, 
    size,
    position,
    rounded,
    closeButton = true,
    closeOnOverlay = true,
    className,
    overlayClassName,
    fullScreen = false,
    ...props 
  }, ref) => {
    const handleClose = closeOnOverlay ? onClose : () => {}

    // Full screen modal for mobile
    const modalClass = fullScreen 
      ? "fixed inset-0 w-full h-full max-w-none max-h-none m-0 rounded-none"
      : modalVariants({ size, position, rounded })

    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-[99999] modal-responsive safe-area-inset-top safe-area-inset-bottom" 
          onClose={handleClose}
        >
          {/* Overlay - FIXED: Added z-index */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div 
              className={cn(
                "fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]",
                overlayClassName
              )} 
            />
          </Transition.Child>

          {/* Modal container - FIXED: Added z-index */}
          <div className="fixed inset-0 overflow-y-auto z-[99999]">
            <div className={cn(
              "flex min-h-full items-center justify-center text-center",
              fullScreen ? "p-0" : "p-3 sm:p-4"
            )}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 scale-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 scale-95 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel 
                  ref={ref}
                  className={cn(modalClass, className)}
                  {...props}
                >
                  {/* Header */}
                  {(title || closeButton) && (
                    <div className={cn(
                      "flex items-start justify-between border-b border-gray-200",
                      fullScreen ? "p-4 sm:p-6" : "p-4 sm:p-6"
                    )}>
                      <div className="flex-1 min-w-0">
                        {title && (
                          <Dialog.Title 
                            as="h3" 
                            className="heading-responsive-sm font-semibold text-gray-900 truncate"
                          >
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="text-body-responsive text-gray-600 mt-1">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      
                      {closeButton && (
                        <button
                          type="button"
                          className="ml-4 flex-shrink-0 rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 touch-friendly"
                          onClick={onClose}
                          aria-label="Close modal"
                        >
                          <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div className={cn(
                    "flex-1 overflow-y-auto",
                    fullScreen ? "p-4 sm:p-6" : "p-4 sm:p-6"
                  )}>
                    {children}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    )
  }
)
Modal.displayName = "Modal"

// Modal Header Component
export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-start justify-between p-4 sm:p-6 border-b border-gray-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
ModalHeader.displayName = "ModalHeader"

// Modal Body Component
export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto p-4 sm:p-6", className)}
      {...props}
    >
      {children}
    </div>
  )
)
ModalBody.displayName = "ModalBody"

// Modal Footer Component
export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0 p-4 sm:p-6 border-t border-gray-200 bg-gray-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
ModalFooter.displayName = "ModalFooter"

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmationModalProps) => {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeButton={false}
    >
      <div className="space-y-4 sm:space-y-6">
        <p className="text-body-responsive text-gray-600">
          {message}
        </p>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            className="btn-responsive btn-outline w-full sm:w-auto"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn(
              "btn-responsive w-full sm:w-auto",
              variant === 'destructive' 
                ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500" 
                : "btn-primary"
            )}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Drawer Modal Component (slides in from side on mobile)
interface DrawerModalProps extends Omit<ModalProps, 'position'> {
  side?: 'left' | 'right' | 'top' | 'bottom'
}

export const DrawerModal = ({
  side = 'right',
  className,
  children,
  ...props
}: DrawerModalProps) => {
  const slideClasses = {
    left: "fixed inset-y-0 left-0 w-full max-w-sm sm:max-w-md",
    right: "fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md",
    top: "fixed inset-x-0 top-0 h-full max-h-96 sm:max-h-[50vh]",
    bottom: "fixed inset-x-0 bottom-0 h-full max-h-96 sm:max-h-[50vh]",
  }

  const enterFromClasses = {
    left: "-translate-x-full",
    right: "translate-x-full",
    top: "-translate-y-full",
    bottom: "translate-y-full",
  }

  const leaveToClasses = {
    left: "-translate-x-full",
    right: "translate-x-full", 
    top: "-translate-y-full",
    bottom: "translate-y-full",
  }

  return (
    <Transition appear show={props.isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[99999] modal-responsive" onClose={props.onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 z-[99998]" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom={`opacity-0 ${enterFromClasses[side]}`}
          enterTo="opacity-100 translate-x-0 translate-y-0"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-x-0 translate-y-0"
          leaveTo={`opacity-0 ${leaveToClasses[side]}`}
        >
          <Dialog.Panel className={cn(
            slideClasses[side],
            "transform overflow-hidden bg-white shadow-xl transition-all z-[99999]",
            className
          )}>
            {children}
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}

export default Modal