import { config } from '../config'
import { ILoggerLevel, levels } from 'egg-logger'
import { Middleware } from '@koa/router'
import { HttpException, MethodNotAllowed, NotFound } from '../exception'
import { Context } from 'koa'

function startRequestLog(ctx: Context, startTime: number, logResponseTime = false) {
  const ms = Date.now() - startTime
  if (logResponseTime) {
    ctx.set('X-Response-Time', `${ms}ms`)
  }
  const requestLog: boolean = config.getItem('log.requestLog', true)
  const level: keyof ILoggerLevel = config.getItem('log.level', 'INFO')
  if (requestLog) {      
    if (levels[level] <= levels['DEBUG']) {
      const data = {
        param: ctx.request.query,
        body: ctx.request.body
      }
      ctx.logger.debug(`[${ctx.method}] -> [${ctx.url}] from: ${
        ctx.ip
      } costs: ${ms}ms data:${JSON.stringify(data, null, 4)}`)
    } else {
      ctx.logger.info(
        `[${ctx.method}] -> [${ctx.url}] from: ${ctx.ip} costs: ${ms}ms`
      )
    }
  }
}

export const log: Middleware = async (ctx, next) => {
  const start = Date.now()
  
  try {
    await next()
    startRequestLog(ctx, start, true)

    if (ctx.status === 404) {
      ctx.app.emit('error', new NotFound(), ctx)
    } else if (ctx.status === 405) {
      ctx.app.emit('error', new MethodNotAllowed(), ctx)
    } else if (!ctx.body) {
      ctx.app.emit('error', new HttpException({ message: ctx.message }), ctx)
    }
    
  } catch (err) {
    startRequestLog(ctx, start)
    ctx.app.emit('error', err, ctx)
  }
}