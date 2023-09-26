export interface PocketGetResponse {
  list: Record<
    string,
    {
      item_id: string
      resolved_id: string
      given_url: string
      given_title: string
      favorite: string
      status: string
      time_added: string
      time_updated: string
      time_read: string
      time_favorited: string
      sort_id: number
      resolved_title: string
      resolved_url: string
      excerpt: string
      is_article: string
      is_index: string
      has_video: string
      has_image: string
      word_count: string
      lang: string
      image?: unknown
      images?: unknown
      listen_duration_estimate: number
      time_to_read?: number
      top_image_url?: string
      authors?: unknown
      domain_metadata?: unknown
    }
  >
  error: null
  search_meta: {
    search_type: string
  }
  since: number
}
