import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  maxLength?: number
  editable?: boolean
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Enter text...',
  maxLength = 50,
  editable = true,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // 当外部值变化时，更新临时值
  useEffect(() => {
    setTempValue(value)
  }, [value])

  // 开始编辑时，聚焦输入框并选中文本
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (editable) {
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    if (tempValue.trim() !== value) {
      onChange(tempValue.trim() || placeholder)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setTempValue(value)
      setIsEditing(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (maxLength && newValue.length > maxLength) {
      return
    }
    setTempValue(newValue)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-transparent border-b border-primary outline-none',
          className
        )}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ width: '100%' }}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'cursor-text truncate',
        editable && 'hover:underline',
        !value && 'text-muted-foreground',
        className
      )}
      title={editable ? 'Click to edit' : undefined}
    >
      {value || placeholder}
    </div>
  )
}

export default EditableText