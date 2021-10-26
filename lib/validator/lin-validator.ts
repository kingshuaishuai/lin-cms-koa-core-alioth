import { PlainObject } from '../types'
import { RouterContext } from '@koa/router'
import { cloneDeep, get, isArray, isString, unset } from 'lodash'
import validator from 'validator'
import { getAllFieldNames, getAllMethodNames, toLine } from '../utils/util'
import { HttpException, ParametersException } from '../exception'
import { isNotEmpty } from 'class-validator'

export interface LinValidatorData {
  body: RouterContext['request']['body']
  query: RouterContext['request']['query']
  path: RouterContext['params']
  header: RouterContext['request']['header']
}

interface LinValidatorParsed extends LinValidatorData {
  default: PlainObject
}

type SyncValidateFuncReturn = boolean | [boolean, string, string?]

export type LinValidateFnReturn = SyncValidateFuncReturn | Promise<SyncValidateFuncReturn> 

export interface ValidateFunction {
  (...values: any[]): LinValidateFnReturn
}


// ParsedUrlQuery
export class LinValidator {
  [key: string]: any
  data: LinValidatorData | PlainObject = {}

  parsed: LinValidatorParsed | PlainObject = {}

  alias: PlainObject | undefined

  errors: Array<{
    key: string
    message: string | string[]
  }> = []

  async validate(ctx: RouterContext, alias?: PlainObject) {
    this.alias = alias
    this.data = {
      body: ctx.request.body,
      query: ctx.request.query,
      path: ctx.params,
      header: ctx.request.header
    }
    const tmpData = cloneDeep(this.data)
    this.parsed = {
      ...tmpData,
      default: {}
    }

    // 进行规则校验，如果失败，则将错误信息提取出来进行返回
    if (!await this.checkRules()) {
      let obj: string | string[] | { [key: string]: string | string[]} = {}
      if (this.errors.length === 1) {
        obj = this.errors[0].message
      } else {
        for (const err of this.errors) {
          if (!obj[err.key]) {
            obj[err.key] = err.message
          }
        }
      }
      throw new ParametersException({
        message: obj
      })
    } else {
      ctx.v = this
      return this
    }
  }

  async checkRules() {
    // 1. 获取 Rule或者Rule[]类型的属性
    const rkeys = getAllFieldNames(this, {
      filter: key => {
        if (!isString(key)) return false
        const value = this[key]
        if (isArray(value)) {
          if (value.length === 0) {
            return false
          }
          for (const it of value) {
            if (!(it instanceof Rule)) {
              throw new Error('every item must be a instance of Rule')
            }
          }
        } else {
          return value instanceof Rule
        }
        return true
      }
    })
    // 2. 根据alias别名进行替换
    const keys = this.replace(rkeys)
    // 3. 遍历keys，进行规则校验
    for (const key of keys) {
      const value = this[key] as (Rule | Rule[])
      const [dataKey, dataValue] = this.findInData(key)
      let optional = false
      let defaultValue
      let stoppedFlag = false
      // 如果当前字段不存在，则进行校验当前字段是否可以不存在
      if (this.isOptional(dataValue)) {
        let errs: string[] = []

        if (isArray(value)) {
          for (const it of value) {
            // 如果是当前配置了可选的Rule，则设置optional为true,并设置默认值，
            // 否则获取到当前Rule校验失败后的提示信息message
            if (it.optional) {
              defaultValue = it.defaultValue && it.defaultValue
              optional = true
            } else {
              !errs.length && errs.push(it.message)
            }
          }
          if (!optional && !errs.length) {
            errs.push(`${key}不可为空`)
          } 
          if (optional) {
            // 设置默认值
            errs = []
            this.parsed['default'][key] = defaultValue
          }
        } else {
          if (value.optional) {
            optional = true
            defaultValue = value.defaultValue && value.defaultValue
          } else {
            // message = value.message
            errs.push(value.message)
          }
        }
        if (errs.length) {
          this.errors.push({
            key: key,
            message: errs
          })
        }
      } else {
        if (isArray(value)) {
          const errs: string[] = []
          // 遍历Rules进行校验
          for (const it of value) {
            // 当前校验链没有终端并且当前字段不是可选的，则进行校验
            if (!stoppedFlag && !it.optional) {
              const valid = await it.validate(this.data[dataKey!][key])
              if (!valid) {
                errs.push(it.message)
                stoppedFlag = true
              }
            }
            if (it.parsedValue !== void 0) {
              this.parsed[dataKey!][key] = it.parsedValue
            }
          }
          if (errs.length !== 0) {
            this.errors.push({
              key,
              message: errs 
            })
          }
        } else {
          const errs: string[] = []
          if (!stoppedFlag && !value.optional) {
            const valid = await value.validate(this.data[dataKey!][key])
            if (!valid) {
              errs.push(value.message)
              stoppedFlag = true
            }
          }
          if (value.parsedValue !== void 0) {
            this.parsed[dataKey!][key] = value.parsedValue
          }
          if (errs.length !== 0) {
            this.errors.push({
              key,
              message: errs
            })
          }
        }
      }
    }
    // 4. 获取自定义校验函数，进行自定义校验
    const validateFunKeys = getAllMethodNames(this, {
      filter: key => {
        return isString(key) 
          && /validate([A-Z])\w+/g.test(key)
          && typeof this[key] === 'function'
      }
    }) as string[]
    
    for (const validateFuncKey of validateFunKeys) {
      const customerValidateFunc: (data: LinValidatorData | PlainObject) => LinValidateFnReturn = get(this, validateFuncKey)
      // 规则函数，每个都try,catch，并将错误信息加入到整体错误信息中
      // 第一个参数为data
      // 自定义校验函数，第一个参数是校验是否成功，第二个参数为错误信息
      let validRes: SyncValidateFuncReturn
      try {
        validRes = await customerValidateFunc.call(this, this.data)
        if (isArray(validRes) && !validRes[0]) {
          let key
          if (validRes[2]) {
            key = validRes[2]
          } else {
            key = this.getValidateFuncKey(validateFuncKey)
          }
          this.errors.push({
            key,
            message: validRes[1]
          })
        } else if (!validRes) {
          const key = this.getValidateFuncKey(validateFuncKey)
          this.errors.push({ key, message: '参数错误' })
        }
      } catch (err) {
        const key = this.getValidateFuncKey(validateFuncKey)
        if (err instanceof HttpException) {
          this.errors.push({
            key: get(err, 'key') || key,
            message: err.message
          })
        } else {
          this.errors.push({
            key: get(err, 'key') || key,
            message: (err as Error)?.message || '参数错误'
          })
        }
      }
    }
    return this.errors.length === 0
  }

  private replace(keys: (string|symbol)[]): string[] {
    if (!this.alias) {
      return keys.filter(k => isString(k)) as string[]
    }
    const arr: string[] = []
    for (const key of keys) {
      if (!isString(key)) {
        continue
      }
      if (this.alias[key]) {
        this[this.alias[key]] = this[key]
        unset(this, key)
        arr.push(this.alias[key])
      } else {
        arr.push(key)
      }
    }
    return arr
  }

  private findInData(key: string): [keyof LinValidatorData, any] | [] {
    const keys = Object.keys(this.data)
    for (const k of keys) {
      const value = get(this.data[k], key)
      if (value !== undefined) {
        return [k as keyof LinValidatorData, value]
      }
    }
    return []
  }

  isOptional(val: any) {
    // undefined , null , ""  , "    ", 皆通过
    if (val === void 0) return true
    if (val === null) return true
    if (typeof val === 'string') {
      return val === '' || val.trim() === ''
    }
    return false
  }

  private getValidateFuncKey(validateFuncKey: string) {
    let word = validateFuncKey.replace('validate', '')
    word = word.replace(/^[A-Z]/, c => c.toLowerCase())
    return toLine(word)
  }

  get(path: string, parsed = true, ...args: any[]) {
    let defaultValue: any
    if (args.length) {
      defaultValue = args[0]
    }

    if (parsed) {
      // 从this.parsed中获取解析后的值
      const val = get(this.parsed, path, defaultValue && defaultValue)
      // 如果当前值存在，直接返回
      if (!this.isOptional(val)) {
        return val
      } else {
        // 如果不存在，则从default中获取默认值
        const index = path.lastIndexOf('.')
        // 获取到a.b.c路径中最后一个，例如a.b.c中的c
        const suffix = path.substring(index + 1, path.length)
        return get(this.parsed['default'], suffix, defaultValue && defaultValue)
      }
    } else {
      return get(this.data, path, defaultValue && defaultValue)
    }
  }
}

export class Rule {
  validateFunction: string | ValidateFunction
  message: string
  options: any[]
  optional = false
  defaultValue: any
  rawValue: any
  parsedValue: any

  constructor(
    validateFunction: string | ValidateFunction,
    messages?: string,
    ...options: any[]
  ) {
    this.validateFunction = validateFunction
    this.message = messages || '参数错误'
    this.options = options

    if (this.validateFunction === 'isOptional') {
      this.optional = true
      this.defaultValue = options[0]
    }
  }

  validate(value: any): LinValidateFnReturn {
    this.rawValue = value
    if (!isString(this.validateFunction)) {
      return this.validateFunction(value, ...this.options)
    } else {
      switch (this.validateFunction) {
      case 'isInt':
        if (isString(value)) {
          this.parsedValue = validator.toInt(value)
          return validator.isInt(value, ...this.options)
        } else {
          this.parsedValue = value
          return validator.isInt(String(value), ...this.options)
        }
      case 'isFloat':
        if (isString(value)) {
          this.parsedValue = validator.toFloat(value)
          return validator.isFloat(value, ...this.options)
        } else {
          this.parsedValue = value
          return validator.isFloat(String(value), ...this.options)
        }
      case 'isBoolean':
        if (typeof value === 'string') {
          this.parsedValue = validator.toBoolean(value)
          return validator.isBoolean(value)
        } else {
          this.parsedValue = value
          return validator.isBoolean(String(value))
        }
      case 'isNotEmpty':
        return isNotEmpty(value)
      default:
        return validator[this.validateFunction](value, ...this.options)
      }
    }
  }
}
