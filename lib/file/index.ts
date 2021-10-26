import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { v4 as uuid } from 'uuid'
import dayjs from 'dayjs'
import { config } from '../config'
import { mkdirsSync } from '../utils/util'
import { FileInfo } from '../types'

/**
 * 上传文件类，所有文件上传的基类
 */
export class Uploader {
  private storeDir: string | undefined

  constructor(storeDir: string) {
    this.storeDir = storeDir
  }

  /**
   * 处理文件对象
   * { size, encoding, fieldname, filename, mimeType, data }
   */
  public async upload(files: any[]): Promise<any> {
    throw new Error('you must overload this method')
  }

  public getStorePath(filename: string) {
    // uuid.ext
    const filename2 = this.generateName(filename)
    // YYYY/MM/DD
    const formatDay = this.getFormatDay()
    // baseDir/YYYY/MM/DD
    const dir = this.getExactStoreDir(formatDay)
    const exists = fs.existsSync(dir)
    if (!exists) {
      mkdirsSync(dir)
    }

    return {
      absolutePath: path.join(dir, filename2),
      relativePath: `${formatDay}/${filename2}`,
      realName: filename2
    }
  }

  /**
   * 生成文件名
   * @param filename 文件名
   */
  public generateName(filename: string) {
    const ext = path.extname(filename)
    return `${uuid()}${ext}`
  }

  /**
   * getFormatDay
   */
  public getFormatDay() {
    return dayjs().format('YYYY/MM/DD')
  }

  /**
   * 获得确切的保存路径
   */
  public getExactStoreDir(formatDay: string) {
    const baseDir = config.getItem('baseDir', process.cwd())
    const storeDir = this.storeDir || config.getItem('file.storeDir')
    if (!storeDir) {
      throw new Error('storeDir must not be undefined')
    }
    const extract = path.isAbsolute(storeDir)
      ? path.join(storeDir, formatDay)
      : path.join(baseDir, storeDir, formatDay)
    return extract
  }

  /**
   * 生成图片的md5
   */
  public generateMd5(item: FileInfo) {
    const buf = item.data
    const md5 = crypto.createHash('md5')
    return md5.update(buf).digest('hex')
  }
}