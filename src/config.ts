import fs from 'fs'

export class Config<T> {
  data: Partial<T> = {}
  path: string
  constructor(path: string, defaults: Partial<T> = {}) {
    this.data = defaults
    this.path = path
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, JSON.stringify(defaults, null, 2))
    } else {
      this.read()
    }
  }

  private read() {
    const file = fs.readFileSync(this.path, 'utf8')
    this.data = JSON.parse(file)
  }

  private write() {
    fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2))
  }

  get<NAME extends keyof T>(name: NAME): T[NAME] | undefined {
    return this.data[name]
  }
  set<NAME extends keyof T>(name: NAME, value: T[NAME]) {
    this.data[name] = value
    this.write()
  }
}
