import {add} from './doSomeStuff'

describe('test add function', () => {
  it('should return 3 for add(1, 2)', () => {
    expect(add(1, 2)).toBe(3)
  })
})
