import { isInteger, isNumber } from 'lodash'
import { CodeMessageContainer } from '../global-vars'
import { Exception } from '../types'
import { assert } from '../utils/util'

export class HttpException extends Error {
  [key:string]:any
  /**
   * http 状态码
   */
  public status = 500

  /**
   * 返回的信息内容
   */
  public message: any = CodeMessageContainer.codeMessage.getMessage(9999)

  /**
   * 特定的错误码
   */
  public code = 9999

  public fields: string[] = ['message', 'code']

  constructor(ex?: Exception | number) {
    super()
    this.exceptionHandler(ex)
  }

  public exceptionHandler(ex?: Exception | number) {
    if (isNumber(ex)) {
      this.code = ex
      this.message = CodeMessageContainer.codeMessage.getMessage(ex)
      return
    } 
    if (ex && (ex as Exception).code) {
      assert(isInteger((ex as Exception).code))
      const code = (ex as Exception).code as number 
      this.code = code
      this.message = CodeMessageContainer.codeMessage.getMessage(code)
    }
    if (ex && (ex as Exception).message) {
      this.message = (ex as Exception).message
    }
  }
}

export class Success extends HttpException {
  public status = 201
  public message = CodeMessageContainer.codeMessage.getMessage(0)
  public code = 0

  constructor(ex?: Exception | number) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 失败
 */
export class Failed extends HttpException {
  public status = 400
  public message = CodeMessageContainer.codeMessage.getMessage(9999)
  public code = 9999

  constructor(ex?: Exception | number) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 认证失败
 */
export class AuthFailed extends HttpException {
  public status = 401
  public message = CodeMessageContainer.codeMessage.getMessage(10000)
  public code = 10000

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 资源不存在
 */
export class NotFound extends HttpException {
  public status = 404
  public message = CodeMessageContainer.codeMessage.getMessage(10020)
  public code = 10020

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 参数错误
 */
export class ParametersException extends HttpException {
  public status = 400
  public message = CodeMessageContainer.codeMessage.getMessage(10030)
  public code = 10030

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 请求方法不允许
 */
export class MethodNotAllowed extends HttpException {
  public status = 405
  public message = CodeMessageContainer.codeMessage.getMessage(10080)
  public code = 10080

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}


/**
 * 文件扩展名不符合规范
 */
export class FileExtensionException extends HttpException {
  public status = 406
  public message = CodeMessageContainer.codeMessage.getMessage(10130)
  public code = 10130

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}


/**
 * 文件体积过大
 */
export class FileTooLargeException extends HttpException {
  public status = 413
  public message = CodeMessageContainer.codeMessage.getMessage(10110)
  public code = 10110

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 文件数量过多
 */
export class FileTooManyException extends HttpException {
  public status = 413
  public message = CodeMessageContainer.codeMessage.getMessage(10120)
  public code = 10120

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}


/**
 * 令牌过期
 */
export class ExpiredTokenException extends HttpException {
  public status = 422
  public message = CodeMessageContainer.codeMessage.getMessage(10050)
  public code = 10050

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 令牌失效或损坏
 */
export class InvalidTokenException extends HttpException {
  public status = 401
  public message = CodeMessageContainer.codeMessage.getMessage(10040)
  public code = 10040

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * refresh token 获取失败
 */
export class RefreshException extends HttpException {
  public status = 401
  public message = CodeMessageContainer.codeMessage.getMessage(10100)
  public code = 10100

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 字段重复
 */
export class RepeatException extends HttpException {
  public status = 400
  public message = CodeMessageContainer.codeMessage.getMessage(10060)
  public code = 10060

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}

/**
 * 禁止操作
 */
export class Forbidden extends HttpException {
  public status = 403
  public message = CodeMessageContainer.codeMessage.getMessage(10070)
  public code = 10070

  constructor(ex ? : Exception) {
    super()
    this.exceptionHandler(ex)
  }
}