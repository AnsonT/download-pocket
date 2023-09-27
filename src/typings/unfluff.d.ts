declare module 'unfluff' {
  export interface UnfluffData {
    title: string
    softTitle: string
    date: string | null
    copyright: string
    author: string[]
    publisher?: string
    text: string
    image?: string
    videos?: string[]
    tags?: string[]
    canonicalLink: string
    lang: string
    description: string
    favicon?: string
    links: { text: string, href: string }[]
  }

  export default function unfluff(html: string): UnfluffData
}
