import { Context } from 'koa'
import { logger } from '../extend'
import { config } from '../config'
import { HttpException } from '../exception'
import { CodeMessageContainer } from '../global-vars'

export const error = (err: Error, ctx: Context) => {
  ctx.type = 'application/json'
  if (err instanceof HttpException) {
    ctx.status = err.status || 500
    ctx.body = JSON.stringify({
      code: err.code,
      message: err.message,
      request: `${ctx.method} ${ctx.request.url}`
    })
  } else {
    logger.error(err)
    if (config.isDebug()) {
      ctx.body = JSON.stringify(err)
    } else {
      ctx.body = JSON.stringify({
        code: 9999,
        message: CodeMessageContainer.codeMessage.getMessage(9999),
        request: `${ctx.method} ${ctx.request.url}`
      })
    }
  }
}
