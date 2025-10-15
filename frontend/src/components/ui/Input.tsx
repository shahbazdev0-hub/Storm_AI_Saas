// src/components/ui/Input.tsx - Responsive Input Components
import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

// Input variants
const inputVariants = cva(
  "flex w-full border border-gray-300 bg-white text-gray-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "focus-visible:ring-primary-500 focus-visible:border-primary-500",
        destructive: "border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500",
        success: "border-green-300 focus-visible:ring-green-500 focus-visible:border-green-500",
        warning: "border-yellow-300 focus-visible:ring-yellow-500 focus-visible:border-yellow-500",
      },
      size: {
        sm: "h-8 px-3 py-1 text-xs sm:text-sm rounded-md",
        default: "h-9 px-3 py-2 text-sm sm:text-base rounded-md sm:h-10 sm:px-4",
        lg: "h-11 px-4 py-3 text-base sm:text-lg rounded-lg sm:h-12 sm:px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Label variants
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-gray-700",
        destructive: "text-red-700",
        success: "text-green-700",
        warning: "text-yellow-700",
      },
      size: {
        sm: "text-xs sm:text-sm",
        default: "text-sm sm:text-base",
        lg: "text-base sm:text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Input interfaces
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
  helperText?: string
  label?: string
  required?: boolean
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: string
  helperText?: string
  label?: string
  required?: boolean
  resize?: boolean
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof inputVariants> {
  error?: string
  helperText?: string
  label?: string
  required?: boolean
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

// Base Input Component
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type = "text",
    leftIcon, 
    rightIcon, 
    error, 
    helperText, 
    label, 
    required,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const effectiveVariant = hasError ? "destructive" : variant

    return (
      <div className="form-group-responsive w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              labelVariants({ variant: effectiveVariant, size }),
              "mb-2 block"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400">
                {leftIcon}
              </div>
            </div>
          )}
          
          <input
            type={type}
            id={inputId}
            className={cn(
              inputVariants({ variant: effectiveVariant, size }),
              leftIcon && "pl-8 sm:pl-10",
              rightIcon && "pr-8 sm:pr-10",
              "touch-friendly",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400">
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            "mt-2 text-xs sm:text-sm",
            hasError ? "text-red-600" : "text-gray-500"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Password Input Component
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightIcon'>>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="pointer-events-auto touch-friendly p-1 -m-1"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        }
        className={className}
        {...props}
      />
    )
  }
)
PasswordInput.displayName = "PasswordInput"

// Textarea Component
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size, 
    error, 
    helperText, 
    label, 
    required,
    resize = true,
    id,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const effectiveVariant = hasError ? "destructive" : variant

    return (
      <div className="form-group-responsive w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              labelVariants({ variant: effectiveVariant, size }),
              "mb-2 block"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <textarea
          id={textareaId}
          className={cn(
            inputVariants({ variant: effectiveVariant, size }),
            "min-h-[80px] sm:min-h-[100px]",
            !resize && "resize-none",
            "touch-friendly",
            className
          )}
          ref={ref}
          {...props}
        />
        
        {(error || helperText) && (
          <p className={cn(
            "mt-2 text-xs sm:text-sm",
            hasError ? "text-red-600" : "text-gray-500"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

// Select Component
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    variant, 
    size, 
    options,
    placeholder,
    error, 
    helperText, 
    label, 
    required,
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const effectiveVariant = hasError ? "destructive" : variant

    return (
      <div className="form-group-responsive w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              labelVariants({ variant: effectiveVariant, size }),
              "mb-2 block"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              inputVariants({ variant: effectiveVariant, size }),
              "pr-8 sm:pr-10 appearance-none cursor-pointer",
              "touch-friendly",
              className
            )}
            ref={ref}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            "mt-2 text-xs sm:text-sm",
            hasError ? "text-red-600" : "text-gray-500"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

// Search Input Component
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  showClearButton?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, showClearButton = true, value, onChange, ...props }, ref) => {
    const [searchValue, setSearchValue] = React.useState(value || '')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setSearchValue(newValue)
      onChange?.(e)
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearch?.(searchValue as string)
      }
    }

    const handleClear = () => {
      setSearchValue('')
      onClear?.()
    }

    return (
      <Input
        ref={ref}
        type="search"
        value={searchValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        leftIcon={
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        rightIcon={
          showClearButton && searchValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto touch-friendly p-1 -m-1 hover:text-gray-600"
              tabIndex={-1}
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

// Form Group Component
interface FormGroupProps {
  children: React.ReactNode
  className?: string
  direction?: 'vertical' | 'horizontal'
  gap?: 'sm' | 'default' | 'lg'
}

export const FormGroup = ({ 
  children, 
  className, 
  direction = 'vertical',
  gap = 'default' 
}: FormGroupProps) => {
  const gapClasses = {
    sm: direction === 'vertical' ? 'space-y-2 sm:space-y-3' : 'space-x-2 sm:space-x-3',
    default: direction === 'vertical' ? 'space-y-4 sm:space-y-6' : 'space-x-4 sm:space-x-6',
    lg: direction === 'vertical' ? 'space-y-6 sm:space-y-8' : 'space-x-6 sm:space-x-8',
  }

  return (
    <div className={cn(
      direction === 'vertical' ? 'flex flex-col' : 'flex flex-col sm:flex-row sm:items-end',
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

// Input Group Component (for combining inputs with buttons, etc.)
interface InputGroupProps {
  children: React.ReactNode
  className?: string
}

export const InputGroup = ({ children, className }: InputGroupProps) => {
  return (
    <div className={cn("flex rounded-md shadow-sm", className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0
          const isLast = index === React.Children.count(children) - 1
          const isMiddle = !isFirst && !isLast

          return React.cloneElement(child, {
            ...child.props,
            className: cn(
              child.props.className,
              isFirst && "rounded-r-none border-r-0",
              isLast && "rounded-l-none",
              isMiddle && "rounded-none border-r-0 border-l-0",
              "relative focus:z-10"
            )
          })
        }
        return child
      })}
    </div>
  )
}

export default Input