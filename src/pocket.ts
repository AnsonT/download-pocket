import path from 'path'
import {Config} from './config.js'
import axios from 'axios'
import portfinder from 'portfinder'
import {env} from './env.js'
import express from 'express'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

interface PocketGetResponse {
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

type PocketConfig = {
  authorization: {
    access_token: string
    username: string
  }
  since: number
  offset: number
}

const pocketConfig = new Config<PocketConfig>(
  path.join(process.cwd(), 'pocket.json'),
  {since: 0}
)

class Pocket {
  authorization = {access_token: '', username: ''}

  async authorize() {
    this.authorization = pocketConfig.get('authorization') ?? {
      access_token: '',
      username: '',
    }
    if (this.authorization.access_token) return
    const port = await portfinder.getPortPromise()
    const {
      data: {code},
    } = await axios.post(
      'https://getpocket.com/v3/oauth/request',
      {
        consumer_key: env.POCKET_CONSUMER_KEY,
        redirect_uri: `http://localhost:${port}`,
      },
      {
        headers: {
          'X-Accept': 'application/json',
        },
      }
    )

    return await new Promise((resolve, reject) => {
      const app = express()
      app.use(express.json())
      app.use('/', (req, res) => {
        void axios
          .post(
            'https://getpocket.com/v3/oauth/authorize',
            {
              consumer_key: env.POCKET_CONSUMER_KEY,
              code,
            },
            {
              headers: {
                'X-Accept': 'application/json',
              },
            }
          )
          .then(authResponse => {
            this.authorization = authResponse.data
            pocketConfig.set('authorization', this.authorization)
            res.send('You can close this window now.')
            server.close()
            resolve(this.authorization)
          })
          .catch(error => {
            pocketConfig.set('authorization', {access_token: '', username: ''})
            reject(error)
          })
      })
      const server = app.listen(port, () => {
        import('open').then(module => {
          void module.default(
            `https://getpocket.com/auth/authorize?request_token=${code}&redirect_uri=http://localhost:${port}`
          )
        })
      })
    })
  }
  async get(since = 0, count = 10) {
    const {data} = await axios.post<PocketGetResponse>(
      'https://getpocket.com/v3/get',
      {
        consumer_key: env.POCKET_CONSUMER_KEY,
        access_token: this.authorization.access_token,
        detailType: 'complete',
        sort: 'oldest',
        since: `${since}`,
        count: `${count}`,
      }
    )
    return data
  }

  async getNext(count = 10) {
    const offset = pocketConfig.get('offset') ?? 0
    const result = await this.get(offset, count)
    pocketConfig.set('offset', offset + count)
    return result
  }
}

export const pocket = new Pocket()
