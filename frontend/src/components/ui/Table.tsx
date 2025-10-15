// src/components/ui/Table.tsx - Responsive Table Components
import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

// Table variants
const tableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      variant: {
        default: "border-collapse",
        striped: "border-collapse [&_tbody_tr:nth-child(odd)]:bg-gray-50",
        bordered: "border border-gray-200 [&_td]:border [&_th]:border [&_td]:border-gray-200 [&_th]:border-gray-200",
      },
      size: {
        sm: "[&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2 text-xs sm:text-sm",
        default: "[&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-4 sm:[&_th]:px-6 sm:[&_th]:py-4 sm:[&_td]:px-6 sm:[&_td]:py-4",
        lg: "[&_th]:px-4 [&_th]:py-4 [&_td]:px-4 [&_td]:py-5 sm:[&_th]:px-8 sm:[&_th]:py-6 sm:[&_td]:px-8 sm:[&_td]:py-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Table interfaces
export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {}

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableFooterProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean
}

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sorted?: 'asc' | 'desc' | false
  onSort?: () => void
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  truncate?: boolean
}

export interface TableCaptionProps
  extends React.HTMLAttributes<HTMLTableCaptionElement> {}

// Base Table Component
export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div className="table-responsive">
      <table
        ref={ref}
        className={cn(tableVariants({ variant, size }), className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

// Table Header Component
export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("bg-gray-50 [&_tr]:border-b", className)}
      {...props}
    />
  )
)
TableHeader.displayName = "TableHeader"

// Table Body Component
export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("divide-y divide-gray-200", className)}
      {...props}
    />
  )
)
TableBody.displayName = "TableBody"

// Table Footer Component
export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn("bg-gray-50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
)
TableFooter.displayName = "TableFooter"

// Table Row Component
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, interactive, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors",
        interactive && "hover:bg-gray-50 cursor-pointer active:bg-gray-100",
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

// Table Head Component
export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sorted, onSort, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        sortable && "cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100",
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center space-x-1">
        <span className="truncate">{children}</span>
        {sortable && (
          <div className="flex flex-col ml-1">
            <svg
              className={cn(
                "h-3 w-3 transition-colors",
                sorted === 'asc' ? 'text-gray-900' : 'text-gray-400'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
            </svg>
            <svg
              className={cn(
                "h-3 w-3 -mt-1 transition-colors",
                sorted === 'desc' ? 'text-gray-900' : 'text-gray-400'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        )}
      </div>
    </th>
  )
)
TableHead.displayName = "TableHead"

// Table Cell Component
export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, truncate, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "text-sm text-gray-900",
        truncate && "truncate max-w-0",
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

// Table Caption Component
export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn("mt-4 text-sm text-gray-500", className)}
      {...props}
    />
  )
)
TableCaption.displayName = "TableCaption"

// Responsive Data Table Component
interface DataTableColumn<T = any> {
  key: string
  title: string
  render?: (value: any, record: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  hideOnMobile?: boolean
  hideOnTablet?: boolean
}

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (record: T, index: number) => void
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  className?: string
  size?: VariantProps<typeof tableVariants>['size']
  variant?: VariantProps<typeof tableVariants>['variant']
}

export function DataTable<T = any>({
  columns,
  data,
  loading,
  emptyMessage = "No data available",
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
  className,
  size,
  variant,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return
    
    const newDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(key, newDirection)
  }

  const renderCell = (column: DataTableColumn<T>, record: T, index: number) => {
    const value = record[column.key as keyof T]
    
    if (column.render) {
      return column.render(value, record, index)
    }
    
    return value
  }

  return (
    <div className="overflow-responsive">
      <Table variant={variant} size={size} className={className}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                sortable={column.sortable}
                sorted={sortBy === column.key ? sortDirection : false}
                onSort={() => handleSort(column.key)}
                style={{ 
                  width: column.width,
                  textAlign: column.align || 'left'
                }}
                className={cn(
                  column.hideOnMobile && "hidden sm:table-cell",
                  column.hideOnTablet && "hidden lg:table-cell"
                )}
              >
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="text-gray-500">Loading...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((record, index) => (
              <TableRow
                key={index}
                interactive={!!onRowClick}
                onClick={() => onRowClick?.(record, index)}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    style={{ textAlign: column.align || 'left' }}
                    className={cn(
                      column.hideOnMobile && "hidden sm:table-cell",
                      column.hideOnTablet && "hidden lg:table-cell"
                    )}
                    truncate
                  >
                    {renderCell(column, record, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// Mobile Card View for Tables
interface MobileCardTableProps<T = any> {
  data: T[]
  renderCard: (record: T, index: number) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function MobileCardTable<T = any>({
  data,
  renderCard,
  loading,
  emptyMessage = "No data available",
  className,
}: MobileCardTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="card-responsive animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {data.map((record, index) => (
        <div key={index}>
          {renderCard(record, index)}
        </div>
      ))}
    </div>
  )
}

// Responsive Table Container
interface ResponsiveTableProps<T = any> extends DataTableProps<T> {
  mobileRenderCard?: (record: T, index: number) => React.ReactNode
  breakpoint?: 'sm' | 'md' | 'lg'
}

export function ResponsiveTable<T = any>({
  mobileRenderCard,
  breakpoint = 'md',
  ...props
}: ResponsiveTableProps<T>) {
  const hiddenClass = breakpoint === 'sm' ? 'sm:block' : 
                     breakpoint === 'md' ? 'md:block' : 'lg:block'
  const visibleClass = breakpoint === 'sm' ? 'sm:hidden' : 
                      breakpoint === 'md' ? 'md:hidden' : 'lg:hidden'

  return (
    <>
      {/* Desktop Table View */}
      <div className={cn("hidden", hiddenClass)}>
        <DataTable {...props} />
      </div>
      
      {/* Mobile Card View */}
      {mobileRenderCard && (
        <div className={cn("block", visibleClass)}>
          <MobileCardTable
            data={props.data}
            renderCard={mobileRenderCard}
            loading={props.loading}
            emptyMessage={props.emptyMessage}
          />
        </div>
      )}
    </>
  )
}

export default Table