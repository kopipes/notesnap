'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { SlashCommandItem } from './SlashCommandExtension'

interface SlashCommandMenuProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

export interface SlashCommandMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(
  function SlashCommandMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }: { event: KeyboardEvent }) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item) command(item)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="slash-command-menu">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            className={`slash-command-item w-full text-left ${index === selectedIndex ? 'is-selected' : ''}`}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => command(item)}
          >
            <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
            <span className="flex flex-col min-w-0">
              <span className="font-medium text-sm truncate">{item.title}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    )
  }
)

export default SlashCommandMenu
