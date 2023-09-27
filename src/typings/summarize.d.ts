declare module 'summarize' {
  export default function summarize(html: string): {
    text: string
    difficulty: number
    image: string
    minutes: number
    ok: boolean
    sentiment: number
    title: string
    topics: string[]
    words: number
  }
}
