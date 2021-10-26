import path from 'path'
import Application from 'koa'
import asyncBusboy from 'async-busboy'
import { FileExtensionException, FileTooLargeException, FileTooManyException, HttpException } from '../exception'
import { config } from '../config'
import { CodeMessageContainer } from '../global-vars'
import { FileInfo, MultipartOptions } from '../types'


export const multipart = (app: Application) => {
  app.context.multipart = async function(opts?: MultipartOptions): Promise<FileInfo[]> {
    // multipart/form-data
    if (!this.is('multipart', '*')) {
      throw new Error('Content-Type must be multipart/*')
    }

    const filePromises: Array<Promise<FileInfo>> = []

    // 1. 通过async-busboy库获取到请求中的文件信息（promise）
    const { fields } = await asyncBusboy(this.req, {
      onFile: (
        fieldName: string,
        file: NodeJS.ReadableStream,
        fileName: string,
        encoding: string,
        mimeType: string
      ) => {
        const buffers:Buffer[] = []
        const filePromise = new Promise<FileInfo>((resolve, reject) => {
          file.on('error', (err) => {
            file.resume()
            reject(err)
          }).on('data', (chunk: Buffer) => {
            buffers.push(chunk)
          }).on('end', () => {
            const buf = Buffer.concat(buffers)
            
            resolve({
              size: buf.length,
              encoding,
              fieldName,
              fileName,
              mimeType,
              data: buf
            })
          })
        })
        filePromises.push(filePromise)
      },
      defCharset: 'utf-8'
    })

    // 2. 获取到promise中的文件信息病存储
    const files: FileInfo[] = []
    let totalSize = 0

    for (const filePromise of filePromises) {
      let file: FileInfo
      try {
        file = await filePromise
      } catch (err) {
        throw new HttpException({
          code: 10210
        })
      }
      const ext = path.extname(file.fieldName)
      // 2.1 检查文件后缀是否在许可范围内
      if (!checkFileExtension(ext, opts?.include, opts?.exclude)) {
        throw new FileExtensionException({
          code: 10130,
          message: CodeMessageContainer.codeMessage.getMessage(10130).replace('{ext}', ext)
        })
      }
      // 2.2 检查单文件大小是否超过文件大小限制
      const { valid, confSize } = checkSingleFileSize(file.size, opts?.singleLimit)
      if (!valid) {
        throw new FileTooLargeException({
          code: 10110,
          message: CodeMessageContainer.codeMessage
            .getMessage(10110)
            .replace('{name}', file.fileName)
            .replace('{size}', confSize)
        })
      }
      totalSize += file.size
      files.push(file)
    }

    // 3. 检查文件数量，不能超过限制
    const { valid: numValid, confNum } = checkFileNum(files.length, opts?.fileNum)
    if (!numValid) {
      throw new FileTooManyException({
        code: 10121,
        message: CodeMessageContainer.codeMessage
          .getMessage(10121)
          .replace('{num}', confNum.toString())
      })
    }
    // 4. 检查文件总大小，默认20M
    const { valid: totalValid, confTotalLimit  } = checkTotalFileSize(totalSize, opts?.totalLimit)
    if (!totalValid) {
      throw new FileTooLargeException({
        code: 10111,
        message: CodeMessageContainer.codeMessage
          .getMessage(10111)
          .replace('{size}', confTotalLimit.toString())
      })
    }
    this.request.fields = fields
    return files
  }
}

// 检查文件后缀名是否正确
function checkFileExtension(ext: string, include?: string[], exclude?: string[]) {
  const fileInclude = include ? include : config.getItem('file.include')
  const fileExclude = exclude ? exclude : config.getItem('file.exclude')

  if (fileInclude) {
    if (!Array.isArray(fileInclude)) {
      throw new Error('file_include must an array!')
    }
    return fileInclude.includes(ext)
  }
  if (fileExclude && !fileInclude) {
    if (!Array.isArray(fileExclude)) {
      throw new Error('file_exclude must an array!')
    }
    return !fileExclude.includes(ext)
  }
  return false
}

function checkSingleFileSize(size: number, singleLimit?: number) {
  // 默认2M
  const confSize = singleLimit
    ? singleLimit
    : config.getItem('file.singleLimit', 1024 * 1024 * 2)

  return {
    valid: confSize > size,
    confSize
  }
}

function checkFileNum(num: number, fileNum?: number) {
  // 默认上传10个
  const confNum = fileNum ? fileNum : config.getItem('file.nums', 10) as number
  return {
    valid: num < confNum,
    confNum
  }
}

function checkTotalFileSize(totalSize: number, fileTotalLimit?: number) {
  const confTotalLimit = fileTotalLimit 
    ? fileTotalLimit 
    : config.getItem('file.totalLimit', 1024 * 1024 * 20) as number
  return {
    valid: confTotalLimit > totalSize,
    confTotalLimit
  }
}