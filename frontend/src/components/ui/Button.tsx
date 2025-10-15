// src/components/ui/Button.tsx - Responsive Button Component
import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

// Button variants using class-variance-authority for better maintainability
const buttonVariants = cva(
  // Base styles - responsive by default
  "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-friendly",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500",
        ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
        link: "text-primary-600 underline-offset-4 hover:underline focus-visible:ring-primary-500",
        success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-500",
      },
      size: {
        xs: "h-7 px-2 text-xs sm:h-8 sm:px-3", // Extra small - responsive
        sm: "h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm", // Small - responsive
        default: "h-9 px-4 py-2 text-sm sm:h-10 sm:px-6 sm:text-base", // Default - responsive
        lg: "h-10 px-6 py-2.5 text-base sm:h-11 sm:px-8 sm:text-lg", // Large - responsive
        xl: "h-12 px-8 py-3 text-lg sm:h-14 sm:px-10 sm:text-xl", // Extra large - responsive
        icon: "h-9 w-9 sm:h-10 sm:w-10", // Icon button - responsive
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      loading: {
        true: "cursor-wait",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
      loading: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth, 
    loading, 
    leftIcon, 
    rightIcon, 
    children, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, loading, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">
            {leftIcon}
          </span>
        )}
        
        <span className={cn(
          "flex-1 text-center",
          (leftIcon || rightIcon || loading) && "truncate"
        )}>
          {children}
        </span>
        
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

// Specialized button components for common use cases

// Responsive Icon Button
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'> & {
  icon: React.ReactNode
  'aria-label': string
}>(({ icon, className, size = "icon", ...props }, ref) => (
  <Button
    ref={ref}
    size={size}
    className={cn("flex-shrink-0", className)}
    {...props}
  >
    {icon}
  </Button>
))

IconButton.displayName = "IconButton"

// Responsive Floating Action Button
export const FAB = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "lg", variant = "default", ...props }, ref) => (
    <Button
      ref={ref}
      size={size}
      variant={variant}
      className={cn(
        "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 rounded-full shadow-lg hover:shadow-xl z-50",
        "h-12 w-12 sm:h-14 sm:w-14 p-0", // Override size for consistent FAB sizing
        className
      )}
      {...props}
    />
  )
)

FAB.displayName = "FAB"

// Responsive Button Group
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  size?: VariantProps<typeof buttonVariants>['size']
  variant?: VariantProps<typeof buttonVariants>['variant']
}

export const ButtonGroup = ({ 
  children, 
  className, 
  orientation = 'horizontal',
  size,
  variant 
}: ButtonGroupProps) => {
  const isVertical = orientation === 'vertical'
  
  return (
    <div
      className={cn(
        "inline-flex",
        isVertical 
          ? "flex-col" 
          : "flex-row flex-wrap sm:flex-nowrap",
        className
      )}
      role="group"
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === Button) {
          const isFirst = index === 0
          const isLast = index === React.Children.count(children) - 1
          
          return React.cloneElement(child, {
            ...child.props,
            size: size || child.props.size,
            variant: variant || child.props.variant,
            className: cn(
              child.props.className,
              isVertical ? (
                isFirst ? "rounded-b-none" : 
                isLast ? "rounded-t-none" : 
                "rounded-none border-t-0"
              ) : (
                isFirst ? "rounded-r-none" : 
                isLast ? "rounded-l-none border-l-0" : 
                "rounded-none border-l-0"
              ),
              "focus:z-10 relative"
            )
          })
        }
        return child
      })}
    </div>
  )
}

// Responsive Split Button
interface SplitButtonProps extends Omit<ButtonProps, 'rightIcon'> {
  dropdownItems: Array<{
    label: string
    onClick: () => void
    icon?: React.ReactNode
    disabled?: boolean
  }>
  dropdownLabel?: string
}

export const SplitButton = forwardRef<HTMLButtonElement, SplitButtonProps>(
  ({ children, dropdownItems, dropdownLabel = "More options", className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    
    return (
      <div className="relative inline-flex">
        <Button
          ref={ref}
          className={cn("rounded-r-none border-r-0", className)}
          {...props}
        >
          {children}
        </Button>
        
        <div className="relative">
          <Button
            variant={props.variant}
            size={props.size}
            className="rounded-l-none px-2 sm:px-3 border-l border-white/20"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={dropdownLabel}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
          
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1 w-48 sm:w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                {dropdownItems.map((item, index) => (
                  <button
                    key={index}
                    className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-friendly"
                    onClick={() => {
                      item.onClick()
                      setIsOpen(false)
                    }}
                    disabled={item.disabled}
                  >
                    {item.icon && (
                      <span className="mr-3 flex-shrink-0">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
)

SplitButton.displayName = "SplitButton"

export { buttonVariants }
export default Button