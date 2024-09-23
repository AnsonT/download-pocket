import {type EnvType, load} from 'ts-dotenv'

export type Env = EnvType<typeof schema>

export const schema = {
  NODE_ENV: {
    type: String,
    optional: true,
    default: 'development',
  },
  POCKET_CONSUMER_KEY: String,
  DATA_DIR: {
    type: String,
    optional: true,
    default: '_data',
  },
}

export let env: Env = load(schema)

export function loadEnv(): void {
  env = load(schema)
}
