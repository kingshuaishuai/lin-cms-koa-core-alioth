import Application from 'koa'
import { get, set } from 'lodash'
import { HttpException } from '..'
import { PlainObject } from '../types'
import { toLine, unsets } from '../utils/util'

export function json(app: Application) {
  app.context.json = function(obj, hide = []) {
    this.type = 'application/json'
    unsets(obj, hide)
    let data = Object.create(null)
    if (obj instanceof HttpException) {
      transform(obj, data)
      set(data, 'request', `${this.method} ${this.req.url}`)
      this.status = obj.status
    } else {
      data = obj
    }
    this.body = JSON.stringify(data)
  }
}

// 驼峰转换下划线
export function transform(obj: any, data: PlainObject) {
  const fields: string[] = get(obj, 'fields', [])
  fields.forEach(field => {
    data[toLine(field)] = get(obj, field)
  })
}