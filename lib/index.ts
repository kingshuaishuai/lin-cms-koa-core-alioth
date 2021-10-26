export * from './config'
export * from './router'
export * from './loader'
export * from './exception'
export * from './middleware'
export * from './extend'
export * from './validator'
export * from './file'
export * from './jwt'
export * from './interface'
export * from './utils'
export * from './encrypt'
export * from './types'
export * from './global-vars'

export { Lin, __version__ } from './core'

import { LinContext } from './types'

declare module 'koa' {
  interface BaseContext {
    config: LinContext['config']
    loader: LinContext['loader']
    plugins: LinContext['plugins']
    logger: LinContext['logger']
    v: LinContext['v']
    multipart: LinContext['multipart']
    jwt: LinContext['jwt']
    json: LinContext['json']
    success: LinContext['success']
    matched: LinContext['matched']
  }
}
