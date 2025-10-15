// src/components/ui/Card.tsx - Responsive Card Components
import React, { forwardRef } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

// Base Card variants
const cardVariants = cva(
  "bg-white border border-gray-200 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "shadow-sm hover:shadow-md",
        elevated: "shadow-md hover:shadow-lg",
        outline: "border-2 shadow-none hover:shadow-sm",
        ghost: "border-0 shadow-none bg-transparent",
      },
      size: {
        sm: "p-3 sm:p-4 rounded-md",
        default: "p-4 sm:p-6 rounded-lg",
        lg: "p-6 sm:p-8 rounded-xl",
      },
      interactive: {
        true: "cursor-pointer hover:bg-gray-50 active:bg-gray-100",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

// Card interfaces
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

// Base Card Component
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive }), className)}
      {...props}
    >
      {children}
    </div>
  )
)
Card.displayName = "Card"

// Card Header Component
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4 sm:pb-6", className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardHeader.displayName = "CardHeader"

// Card Title Component
export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("heading-responsive-sm font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
)
CardTitle.displayName = "CardTitle"

// Card Description Component
export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-body-responsive text-gray-600", className)}
      {...props}
    >
      {children}
    </p>
  )
)
CardDescription.displayName = "CardDescription"

// Card Content Component
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1", className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardContent.displayName = "CardContent"

// Card Footer Component
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4 sm:pt-6", className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardFooter.displayName = "CardFooter"

// Specialized Card Components

// Stats Card Props
interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'gray'
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  className?: string
  onClick?: () => void
}

const colorClasses = {
  green: 'bg-green-500',
  blue: 'bg-blue-500 bg-primary-600',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
}

// Responsive Stats Card Component
export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, change, icon: Icon, color = 'blue', trend, loading, className, onClick, ...props }, ref) => {
    const isPositive = change !== undefined ? change >= 0 : trend === 'up'
    const isInteractive = !!onClick

    return (
      <Card
        ref={ref}
        variant="default"
        size="default"
        interactive={isInteractive}
        className={cn("overflow-hidden", className)}
        onClick={onClick}
        {...props}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={cn(
              "p-2 sm:p-3 rounded-md",
              colorClasses[color]
            )}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
            <dl>
              <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline mt-1">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                  {loading ? (
                    <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    value
                  )}
                </div>
                {change !== undefined && !loading && (
                  <div className={cn(
                    "ml-2 flex items-baseline text-xs sm:text-sm font-semibold",
                    isPositive ? 'text-green-600' : 'text-red-600'
                  )}>
                    {isPositive ? (
                      <ArrowUpIcon className="self-center flex-shrink-0 h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    ) : (
                      <ArrowDownIcon className="self-center flex-shrink-0 h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                    )}
                    <span className="sr-only">{isPositive ? 'Increased' : 'Decreased'} by</span>
                    <span className="ml-0.5">{Math.abs(change)}%</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </Card>
    )
  }
)
StatsCard.displayName = "StatsCard"

// Metric Card Props
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
  loading?: boolean
  className?: string
}

// Simple Metric Card Component
export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, subtitle, icon: Icon, actions, loading, className, ...props }, ref) => (
    <Card
      ref={ref}
      variant="default"
      size="default"
      className={className}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {Icon && (
              <div className="flex-shrink-0">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {loading ? (
              <div className="h-8 sm:h-10 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-xl sm:text-3xl font-bold text-gray-900">
                {value}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0 ml-3">
            {actions}
          </div>
        )}
      </div>
    </Card>
  )
)
MetricCard.displayName = "MetricCard"

// Feature Card Props
interface FeatureCardProps {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  image?: string
  actions?: React.ReactNode
  badge?: string
  className?: string
  onClick?: () => void
}

// Feature Card Component
export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, description, icon: Icon, image, actions, badge, className, onClick, ...props }, ref) => (
    <Card
      ref={ref}
      variant="default"
      size="default"
      interactive={!!onClick}
      className={className}
      onClick={onClick}
      {...props}
    >
      {image && (
        <div className="aspect-video-responsive w-full overflow-hidden rounded-t-lg mb-4 sm:mb-6">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="flex items-start space-x-3 sm:space-x-4">
        {Icon && (
          <div className="flex-shrink-0">
            <div className="p-2 sm:p-3 bg-primary-100 rounded-lg">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="heading-responsive-sm font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-body-responsive text-gray-600 mt-1 sm:mt-2">
                {description}
              </p>
            </div>
            {badge && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                {badge}
              </span>
            )}
          </div>
          {actions && (
            <div className="mt-3 sm:mt-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
)
FeatureCard.displayName = "FeatureCard"

// Export default as StatsCard for backward compatibility
export default StatsCard