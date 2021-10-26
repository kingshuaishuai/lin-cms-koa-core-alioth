import { levels, LoggerLevel, Transport, TransportOptions } from 'egg-logger'
import utils from 'egg-logger/lib/utils'
import { consoleFormatter, MetaData } from './format'

interface ConsoleTransportOptions extends TransportOptions {
  stderrLevel?: number
}

interface ConsoleLogMeta extends MetaData {
  formatter?: (...args: any[]) => any
  raw?: boolean
  error?: Error
}

export class ConsoleTransport<T extends ConsoleTransportOptions = ConsoleTransportOptions> extends Transport<T> {
  constructor(options: T) {
    super(options)
    this.options.stderrLevel = utils.normalizeLevel(options.stderrLevel)
  }

  get defaults(): T {
    return utils.assign(super.defaults, {
      stderrLevel: 'ERROR'
    }) as T
  }

  log(level: LoggerLevel, args: any [], meta: ConsoleLogMeta = { formatter: consoleFormatter }) {
    if (!meta.formatter) {
      meta.formatter = consoleFormatter
    }

    const message = super.log(level, args, meta) as unknown as string | Buffer
    if (levels[level] >= this.options.stderrLevel! && levels[level] < levels['NONE']) {
      process.stderr.write(message)
    } else {
      process.stdout.write(message)
    }
  }
}
