import fs from 'fs'
import path from 'path'
import { LoggerLevel, Transport, TransportOptions } from 'egg-logger'
import utils from 'egg-logger/lib/utils'
import dayjs from 'dayjs'
import mkdirp from 'mkdirp'
import utility from 'utility'
import depd from 'depd'
import { assert } from '../utils/util'
import { config } from '..'
import { MetaData, consoleFormatter } from './format'

declare module 'fs' {
  interface WriteStream {
    _onError: (err: Error) => void
    closed: boolean
  }
}

depd('egg-logger')

interface FileTransportOptions extends TransportOptions {
  dir: string
  sizeLimit: number
  file?: string | null // filepath
  stderrLevel?: number
}

interface ConsoleLogMeta extends MetaData {
  formatter?: (...args: any[]) => any
  raw?: boolean
  error?: Error
}

export class FileTransport<T extends FileTransportOptions = FileTransportOptions> extends Transport<T> {
  _stream: fs.WriteStream | null

  constructor(options: T) {
    super(options)
    assert(!!this.options.dir, 'should pass options.dir')
    assert(!!this.options.sizeLimit, 'should pass options.sizeLimit')

    this._stream = null
    this.reload()
  }

  get defaults() {
    return utils.assign(super.defaults, {
      file: null,
      level: 'INFO'
    })
  }

  get writable() {
    return this._stream && 
    !this._stream.closed &&
    this._stream.writable &&
    !this._stream.destroyed
  }

  log(level: LoggerLevel, args: any[], meta: ConsoleLogMeta = { formatter: consoleFormatter }) {
    if (!meta.formatter) {
      meta.formatter = consoleFormatter
    }
    const filename = this.checkIsPresent()
    if (filename) {
      const overflow = this.checkSizeOverflow(filename)
      // log文件切片
      // 如果log文件存储内容大小超出了，则堆当前log文件进行重命名，再开启一个新的log
      if (overflow) {
        this.renameLogFile(filename)
        this.reload()
      }
    } else {
      // 文件名称不存在则需要重新创建stream
      this.reload()
    }

    // 如果当前log不可写，则进行报错
    if (!this.writable) {
      const err = new Error(`${this.options.file} log stream had been closed`)
      console.error(err.stack)
      return
    }

    const buf = super.log(level, args, meta) as unknown as Buffer

    if (buf.length) {
      this._write(buf)
    }
  }

  _write(buf: Buffer) {
    this._stream?.write(buf)
  }

  /**
   * 检查当前的日志文件是否为当天
   */
  checkIsPresent() {
    // 检查前面的日志
    // 2019-06-01-21:29:01.log
    // 而且检查当前文件夹
    const filename = this.getPresentFilename()
    const exist = fs.existsSync(filename)
    if (exist) {
      return filename
    } else {
      return false
    }
  }

  checkSizeOverflow(filename: string) {
    // sizeLimit 一定得传进来
    const limit: number = this.options.sizeLimit
    const status = fs.statSync(filename)
    // 是否溢出
    return status.size > limit
  }

  renameLogFile(filename: string) {
    const today = dayjs()
    const dir = path.dirname(filename)
    const mill = today.format('HH:mm:ss')
    const refilename = path.join(
      dir,
      `${today.format('YYYY-MM-DD')}-${mill}.log`
    )
    fs.renameSync(filename, refilename)
  }

  close() {
    this._closeStream()
  }

  end() {
    // 标记当前方法已经被弃用
    depd('transport.end() is deprecated, use transport.close()')
    this.close()
  }

  reload() {
    this._closeStream()
    this._stream = this._createStream()
  }

  /**
   * 返回格式为 baseDir/YYYY-MM/YYYY-MM-DD.log的路径
   * @returns 
   */
  getPresentFilename() {
    const baseDir = config.getItem('baseDir', process.cwd())
    const dir = path.isAbsolute(this.options.dir)
      ? this.options.dir
      : path.join(baseDir, this.options.dir)
    const today = dayjs()
    const ddir = path.join(dir, today.format('YYYY-MM'))
    const dfilename = today.format('YYYY-MM-DD')
    const filename = path.join(ddir, `${dfilename}.log`)
    return filename
  }

  private _createStream() {
    const filename = this.getPresentFilename()
    const dirPath = path.dirname(filename)

    if (!fs.existsSync(dirPath)) {
      mkdirp.sync(dirPath)
    }

    const stream = fs.createWriteStream(filename, {
      flags: 'a'
    })

    const onError = (err: Error) => {
      console.error(
        '%s ERROR %s [logger] [%s] %s',
        utility.logDate(','),
        process.pid,
        filename,
        err.stack
      )
      this.reload()
      console.warn(
        '%s WARN %s [logger] [%s] reloaded',
        utility.logDate(','),
        process.pid,
        filename
      )
    }

    stream.once('error', onError)
    stream._onError = onError
    return stream
  }

  private _closeStream() {
    if (this._stream) {
      this._stream.end()
      this._stream.removeListener('error', this._stream._onError)
      this._stream = null
    }
  }
}