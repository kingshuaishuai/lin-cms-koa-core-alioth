import crypto from 'crypto'
import { EncryptOption } from '../types'

const saltChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const saltCharsCount = saltChars.length

/**
 * 随机生成盐
 * @param len 
 * @returns 
 */
function generateSalt(len: number) {
  if (crypto.randomBytes) {
    return crypto
      .randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .substring(0, len)
  } else {
    let salt = ''
    for (let i = 0; i < len; i++) {
      salt += saltChars.charAt(Math.floor(Math.random() * saltCharsCount))
    }
    return salt
  }
}

function generateHash(
  algorithm: string,
  salt: string,
  password: string,
  iterations: number
) {
  iterations = iterations || 1
  try {
    let hash = password
    hash = crypto
      .createHmac(algorithm, salt)
      .update(hash)
      .digest('hex')
    return algorithm + '$' + salt + '$' + iterations + '$' + hash
  } catch (err) {
    throw new Error('Invalid message digest algorithm')
  }
}

/**
 * 生成密文密码
 * @param password 
 * @param options 
 * @returns 
 */
export function generatePassword(password: string, options?: EncryptOption) {
  options = options || {}
  options.algorithm = options.algorithm || 'sha1'
  options.saltLength = options.saltLength || 8
  options.iterations = options.iterations || 1
  const salt = generateSalt(options.saltLength)
  return generateHash(options.algorithm, salt, password, options.iterations)
}

export function verifyPassword(password: string, hashedPassword: string) {
  if (!password || !hashedPassword) return false
  const parts = hashedPassword.split('$')
  if (parts.length !== 4) return false
  try {
    const iter = parseInt(parts[2], 10)
    return generateHash(parts[0], parts[1], password, iter) === hashedPassword
  } catch (e) {
    return false
  }
}

/**
 * 判断当前密码是否为密文
 * @param password 密码
 */
export const isHashedPassword = function(password: string) {
  if (!password) return false
  return password.split('$').length === 4
}