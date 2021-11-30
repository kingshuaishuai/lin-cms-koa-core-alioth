import Application from 'koa'
import jwtGenerator, { JwtPayload, SignOptions, TokenExpiredError, VerifyOptions } from 'jsonwebtoken'
import { TokenType } from '../utils/enums'
import { AuthFailed, config, ExpiredTokenException, InvalidTokenException } from '..'
import { PlainObject } from '../types'
import { get } from 'lodash'

export class Token {
  /**
   * 令牌的secret值，用于令牌的加密
   */
  public secret: string | undefined

  /**
   * access token 默认的过期时间
   */
  public accessExp: number = 60 * 60 // 1h;

  /**
   * refresh token 默认的过期时间
   */
  public refreshExp: number = 60 * 60 * 24 * 30 * 1 // 1 months

  /**
   * 
   * @param secret 令牌secret
   * @param accessExp access token 过期时间
   * @param refreshExp refresh token 过期时间
   */
  constructor(secret?: string, accessExp?: number, refreshExp?: number) {
    secret && (this.secret = secret)
    accessExp && (this.accessExp = accessExp)
    refreshExp && (this.refreshExp = refreshExp)
  }

  public initApp(
    app: Application,
    secret?: string,
    accessExp?: number,
    refreshExp?: number
  ) {
    app.context.jwt = this
    secret && (this.secret = secret)
    accessExp && (this.accessExp = accessExp)
    refreshExp && (this.refreshExp = refreshExp)
  }

  /**
   * 生成access token
   * @param identity 
   * @returns 
   */
  public createAccessToken(identity: string | number) {
    if (!this.secret) {
      throw new Error('secret can not be empty')
    }
    const exp = Math.floor(Date.now() / 1000) + this.accessExp
    return jwtGenerator.sign({
      exp,
      identity,
      scope: 'lin',
      type: TokenType.ACCESS
    }, this.secret)
  }

  public createRefreshToken(identity: string | number) {
    if (!this.secret) {
      throw new Error('secret can not be empty')
    }
    const exp = Math.floor(Date.now() / 1000) + this.refreshExp
    return jwtGenerator.sign({
      exp,
      identity,
      scope: 'lin',
      type: TokenType.REFRESH
    }, this.secret)
  }

  public verifyToken(token: string) {
    if (!this.secret) {
      throw new Error('secret can not be empty')
    }
    let verifyResult: JwtPayload | string
    try {
      verifyResult = jwtGenerator.verify(token, this.secret)
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        const decode = jwtGenerator.decode(token, {})
        if (decode && typeof decode !== 'string') {
          if (decode.type === TokenType.ACCESS) {
            throw new ExpiredTokenException({
              code: 10051
            })
          } else {
            throw new ExpiredTokenException({
              code: 10050
            })
          }
        }
        throw new ExpiredTokenException({
          code: 10051
        })
      } else {
        throw new InvalidTokenException()
      }
    }
    return verifyResult
  }
}

export const jwt = new Token(
  config.getItem('secret'),
  config.getItem('accessExp'),
  config.getItem('refreshExp')
)

/**
 * 生成accessToken
 * @param payload 
 * @param options 
 * @returns 
 */
export function createAccessToken(payload: string | object, options: SignOptions) {
  const exp = Math.floor(Date.now() / 1000) + jwt.accessExp
  if (typeof payload === 'string') {
    return jwtGenerator.sign({
      identity: payload,
      exp,
      type: TokenType.ACCESS
    }, jwt.secret!, options)
  } else {
    return jwtGenerator.sign({
      ...payload,
      exp,
      type: TokenType.ACCESS
    }, jwt.secret!, options)
  }
}

/**
 * 生成refreshToken
 * @param payload 
 * @param options 
 * @returns 
 */
export function createRefreshToken(payload: string | object, options: SignOptions) {
  const exp = Math.floor(Date.now() / 1000) + jwt.refreshExp
  if (typeof payload === 'string') {
    return jwtGenerator.sign({
      identity: payload,
      exp,
      type: TokenType.REFRESH
    }, jwt.secret!, options)
  } else {
    return jwtGenerator.sign({
      ...payload,
      exp,
      type: TokenType.REFRESH
    }, jwt.secret!, options)
  }
}

/**
 * 验证AccessToken
 * @param token 
 * @param options 
 * @returns 
 */
export function verifyAccessToken(token: string, options: VerifyOptions) {
  let decode
  try {
    decode = jwtGenerator.verify(token, jwt.secret!, options)
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new ExpiredTokenException({
        code: 10051
      })
    } else {
      throw new InvalidTokenException({
        code: 10041
      })
    }
  }
  if (!decode['type'] || decode['type'] !== TokenType.ACCESS) {
    throw new InvalidTokenException()
  }
  return decode
}

/**
 * 验证RefreshToken
 * @param token 
 * @param options 
 * @returns 
 */
export function verifyRefreshToken(token: string, options: VerifyOptions) {
  let decode
  try {
    decode = jwtGenerator.verify(token, jwt.secret!, options)
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new ExpiredTokenException({
        code: 10052
      })
    } else {
      throw new InvalidTokenException({
        code: 10042
      })
    }
  }
  if (!decode['type'] || decode['type'] !== TokenType.REFRESH) {
    throw new InvalidTokenException()
  }
  return decode
}

interface User extends PlainObject {
  id: string | number
}

export function getTokens(user: User) {
  const accessToken = jwt.createAccessToken(user.id)
  const refreshToken = jwt.createRefreshToken(user.id)
  return {
    accessToken,
    refreshToken
  }
}

/**
 * 获取header中的authorization 并解析 token，返回解析后的jwt payload
 * @param ctx 
 * @param type 
 * @returns 
 */
export function parseHeader(ctx: Application['context'], type: TokenType = TokenType.ACCESS) {
  if (!ctx.header || !ctx.header.authorization) {
    ctx.throw(new AuthFailed({ code: 10013 }))
  }

  const parts = ctx.header.authorization.split(' ')

  if (parts.length === 2) {
    // Bearer 字段
    const scheme = parts[0]
    // token 字段
    const token = parts[1]
    if (/^Bearer$/i.test(scheme)) {
      const obj = ctx.jwt.verifyToken(token)
      if (!get(obj, 'type') || get(obj, 'type') !== type) {
        ctx.throw(new AuthFailed({ code: 10250 }))
      }
      if (!get(obj, 'scope') || get(obj, 'scope') !== 'lin') {
        ctx.throw(new AuthFailed({ code: 10251 }))
      }
      return obj
    }
  } else {
    ctx.throw(new AuthFailed())
  }
}

