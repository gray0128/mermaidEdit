import React from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { ValidationResult } from '../lib/validator'

interface ErrorPanelProps {
  validation: ValidationResult | null
  className?: string
  onClose?: () => void
}

const ErrorPanel: React.FC<ErrorPanelProps> = ({ 
  validation, 
  className, 
  onClose 
}) => {
  if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
    return null
  }

  return (
    <div className={cn('border-l-4 bg-card p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {validation.errors.length > 0 ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                <h3 className="font-medium text-destructive">
                  {validation.errors.length} {validation.errors.length === 1 ? 'Error' : 'Errors'}
                </h3>
              </>
            ) : (
              <>
                <Info className="h-5 w-5 text-muted-foreground mr-2" />
                <h3 className="font-medium text-muted-foreground">
                  {validation.warnings.length} {validation.warnings.length === 1 ? 'Warning' : 'Warnings'}
                </h3>
              </>
            )}
          </div>

          <div className="space-y-1">
            {validation.errors.map((error, index) => (
              <div key={`error-${index}`} className="flex items-start text-sm text-destructive">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}

            {validation.warnings.map((warning, index) => (
              <div key={`warning-${index}`} className="flex items-start text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 mr-2 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-2 flex-shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default ErrorPanel