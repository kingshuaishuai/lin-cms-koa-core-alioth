import { PlainObject } from '../types'
import os from 'os'
import chalk from 'chalk'
import { LoggerLevel } from 'egg-logger'

const hostname = os.hostname()

export interface MetaData extends PlainObject {
  date?: string
  level?: LoggerLevel
  pid?: number
  message?: string
}

export function consoleFormatter(meta: MetaData): string {
  const message = `${meta.date} ${meta.level} ${meta.pid} --- ${hostname} - ${meta.message}`
  if (!chalk.supportsColor) {
    return message
  }

  if (meta.level === 'ERROR') {
    return chalk.red(message)
  } 
  if (meta.level === 'WARN') {
    return chalk.yellow(message)
  }

  return message
}