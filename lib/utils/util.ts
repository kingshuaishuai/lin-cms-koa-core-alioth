import fs from 'fs'
import { unset } from 'lodash'
import path from 'path'

/**
 * Assertion utility.
 */
export function assert(ok: boolean, ...args: string[]): void {
  if (!ok) {
    throw new Error(args.join(' '))
  }
}

/**
 * 获取文件夹下所有文件名
 * @param dir 文件夹
 */
export function getFiles(dir: string) {
  let res: string[] = []
  const files = fs.readdirSync(dir)
  for (const file of files) {
    // 拼接路径名
    const name = path.join(dir, file)
    // 当前路径为文件夹，则递归读取，拼接到结果队列中
    if (fs.statSync(name).isDirectory()) {
      const tmp = getFiles(name)
      res = res.concat(tmp)
    } else {
      // 如果是文件，则直接将路径放入结果队列
      res.push(name)
    }
  }
  return res
}

export interface ObjOptions {
  prefix?: string
  filter?: (key: string | symbol) => boolean
}

export function getAllFieldNames(obj: object, option?: ObjOptions) {
  const keys = Reflect.ownKeys(obj)
  return prefixAndFilter(keys, option)
}

function prefixAndFilter(keys: (string|symbol)[], option?: ObjOptions) {
  if (option?.prefix) {
    keys = keys.filter(key => key.toString().startsWith(option.prefix!))
  }
  if (option?.filter) {
    keys = keys.filter(option.filter)
  }
  return keys
}

export function getAllMethodNames(obj: object, option?: ObjOptions) {
  const methods = new Set()
  let newObj: object | null = obj
  while ((newObj = Reflect.getPrototypeOf(newObj))) {
    const keys = Reflect.ownKeys(newObj)
    keys.forEach(k => {
      methods.add(k)
    })
  }
  const keys = Array.from(methods.values()) as string[]
  return prefixAndFilter(keys, option)
}

/**
 * 递归创建目录 同步方法
 * @param dirname 目录
 */
export function mkdirsSync(dirname: string) {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}

export function unsets(obj: any, hide: string[]) {
  hide.forEach(k => {
    unset(obj, k)
  })
}

// 驼峰转换下划线
export function toLine(name: string) {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase()
}

/**
 * 检查日期的格式为 "YYYY-MM-DD HH:mm:ss"
 * @param time input time
 */
export function checkDateFormat(time: string) {
  if (!time || time === '') {
    return true
  }
  const r = time.match(
    /^(\d{4})(-|\/)(\d{2})\2(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  )
  if (r === null) return false
  const d = new Date(
    parseInt(r[1], 10),
    parseInt(r[3], 10) - 1,
    parseInt(r[4], 10),
    parseInt(r[5], 10),
    parseInt(r[6], 10),
    parseInt(r[7], 10)
  )
  return (
    d.getFullYear() === parseInt(r[1], 10) &&
    d.getMonth() + 1 === parseInt(r[3], 10) &&
    d.getDate() === parseInt(r[4], 10) &&
    d.getHours() === parseInt(r[5], 10) &&
    d.getMinutes() === parseInt(r[6], 10) &&
    d.getSeconds() === parseInt(r[7], 10)
  )
}