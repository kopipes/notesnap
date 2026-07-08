import { Node, mergeAttributes } from '@tiptap/core'

export interface BibleVerseAttributes {
  reference: string // e.g. "Yohanes 3:16"
}

/**
 * Custom Tiptap node that renders a Bible verse as a styled blockquote
 * with a <cite> element showing the reference.
 *
 * HTML output:
 *   <div class="bible-verse-node">
 *     <p>...</p>
 *     <cite>Yohanes 3:16</cite>
 *   </div>
 */
export const BibleVerseExtension = Node.create<BibleVerseAttributes>({
  name: 'bibleVerse',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      reference: {
        default: '',
        parseHTML: (element) =>
          element.querySelector('cite')?.textContent ?? '',
        renderHTML: ({ reference }) => ({ 'data-reference': reference }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-reference]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const reference = node.attrs.reference as string
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'bible-verse-node' }),
      ['p', 0],
      ['cite', reference],
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'bible-verse-node'
      Object.entries(HTMLAttributes as Record<string, string>).forEach(([k, v]) => {
        wrapper.setAttribute(k, v)
      })

      const p = document.createElement('p')
      wrapper.appendChild(p)

      const cite = document.createElement('cite')
      cite.textContent = node.attrs.reference as string
      wrapper.appendChild(cite)

      return {
        dom: wrapper,
        contentDOM: p,
        update(updatedNode) {
          if (updatedNode.type !== node.type) return false
          cite.textContent = updatedNode.attrs.reference as string
          return true
        },
      }
    }
  },
})
