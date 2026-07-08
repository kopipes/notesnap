import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion, { type SuggestionOptions, type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import SlashCommandMenu from './SlashCommandMenu'

export type SlashCommandItem = {
  title: string
  description: string
  icon: string
  command: (args: { editor: ReturnType<typeof import('@tiptap/react').useEditor> }) => void
}

const SLASH_COMMAND_PLUGIN_KEY = new PluginKey('slashCommand')

export function buildSlashCommands(onAyat: () => void): SlashCommandItem[] {
  return [
    {
      title: '/ayat',
      description: 'Masukkan ayat Alkitab',
      icon: '📖',
      command: () => onAyat(),
    },
    {
      title: 'Heading 1',
      description: 'Judul besar',
      icon: 'H1',
      command: ({ editor }: { editor: ReturnType<typeof import('@tiptap/react').useEditor> }) => {
        if (!editor) return
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
    },
    {
      title: 'Heading 2',
      description: 'Judul sedang',
      icon: 'H2',
      command: ({ editor }: { editor: ReturnType<typeof import('@tiptap/react').useEditor> }) => {
        if (!editor) return
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
    {
      title: 'Daftar Poin',
      description: 'Bullet list',
      icon: '•',
      command: ({ editor }: { editor: ReturnType<typeof import('@tiptap/react').useEditor> }) => {
        if (!editor) return
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      title: 'Daftar Nomor',
      description: 'Ordered list',
      icon: '1.',
      command: ({ editor }: { editor: ReturnType<typeof import('@tiptap/react').useEditor> }) => {
        if (!editor) return
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    {
      title: 'Pemisah',
      description: 'Garis horizontal',
      icon: '—',
      command: ({ editor }: { editor: ReturnType<typeof import('@tiptap/react').useEditor> }) => {
        if (!editor) return
        editor.chain().focus().setHorizontalRule().run()
      },
    },
  ]
}

export function createSlashCommandExtension(onAyat: () => void) {
  return Extension.create({
    name: 'slashCommand',

    addProseMirrorPlugins() {
      const suggestionOptions: Omit<SuggestionOptions<SlashCommandItem>, 'editor'> = {
        char: '/',
        pluginKey: SLASH_COMMAND_PLUGIN_KEY,

        command: ({ editor: ed, range, props }) => {
          props.command({ editor: ed as ReturnType<typeof import('@tiptap/react').useEditor> })
          ed.chain().focus().deleteRange(range).run()
        },

        items: ({ query }: { query: string }): SlashCommandItem[] => {
          const items = buildSlashCommands(onAyat)
          if (!query) return items
          return items.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase())
          )
        },

        render: () => {
          let component: ReactRenderer | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart(props: SuggestionProps<SlashCommandItem>) {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) return

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },

            onUpdate(props: SuggestionProps<SlashCommandItem>) {
              component?.updateProps(props)
              if (!props.clientRect) return
              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown(props: SuggestionKeyDownProps): boolean {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }
              const ref = component?.ref as { onKeyDown?: (p: SuggestionKeyDownProps) => boolean } | null
              return ref?.onKeyDown?.(props) ?? false
            },

            onExit() {
              popup?.[0]?.destroy()
              component?.destroy()
            },
          }
        },
      }

      return [
        Suggestion({
          editor: this.editor,
          ...suggestionOptions,
        }),
      ]
    },
  })
}
