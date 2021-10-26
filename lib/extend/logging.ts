import { Logger, LoggerLevel } from 'egg-logger'
import Application from 'koa'
import { config } from '../config'
import { ConsoleTransport, FileTransport } from '../logger'
import { PlainObject } from '../types'

export const logger = new Logger({})

interface Options extends PlainObject {
  level: LoggerLevel
  dir: string
  sizeLimit: number
  file: boolean
}

function configLogger() {
  // 默认配置
  let options:Options = {
    level: 'INFO',
    dir: 'logs',
    sizeLimit: 1024 * 1024 * 5,
    file: true
  }

  const logConf = config.getItem('log')
  options = {
    ...options,
    ...logConf
  }
  if (options.file) {
    logger.set(
      'file',
      // 日志输出到文件
      new FileTransport({
        dir: options.dir,
        sizeLimit: options.sizeLimit,
        level: options.level
      })
    )
  }
  logger.set('console', new ConsoleTransport({
    level: options.level
  }))
}

export const logging = (app: Application) => {
  configLogger()
  app.context.logger = logger
}