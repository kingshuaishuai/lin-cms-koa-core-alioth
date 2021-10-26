import Application from 'koa'
import { Success } from '..'
import { Exception } from '../types'

export function success(app: Application) {
  app.context.success = function(ex?: Exception) {
    this.type = 'application/json'
    const success = new Success(ex)
    const data = {
      code: success.code,
      message: success.message,
      request: `${this.method} ${this.req.url}`
    }
    this.status = success.status
    this.body = JSON.stringify(data)
  }
}