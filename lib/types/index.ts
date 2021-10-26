import Koa from 'koa'
import Router, { RouterOptions, Layer } from '@koa/router'
import { Logger } from 'egg-logger'
import { Config } from '../config/config'
import { Loader } from '../loader'
import { Plugin } from '../plugin'
import { LinValidator } from '../validator/lin-validator'
import { Token } from '../jwt'

export interface LinContext {
  config: Config
  loader: Loader
  logger: Logger
  plugins: {
    [key: string]: Plugin
  },
  v: LinValidator
  multipart: () => Promise<FileInfo[]>
  jwt: Token
  json: (obj: PlainObject, hide?: []) => void
  success: (ex?: Exception) => void
  matched: Layer[]
}

export interface LinRouterOptions extends RouterOptions {
  module?: string;
  mountPermission?: boolean;
}

export interface Meta {
  permission?: string;
  module?: string;
  mount?: boolean;
}

export type Middleware<StateT = Koa.DefaultState, ContextT = Koa.DefaultContext> = Router.Middleware<StateT, ContextT>

export interface CodeMessageType {
  getMessage: (code: number) => string
  [propName: number]: string
}

export interface Exception {
  code?: number;
  message?: any;
}

export interface PlainObject {
  [key: string]: any
}

export interface FileInfo {
  size: number
  encoding: string
  fileName: string
  mimeType: string
  fieldName: string
  data: Buffer
}

export interface MultipartOptions {
  singleLimit?: number
  totalLimit?: number
  fileNum?: number
  include?: string[]
  exclude?: string[]
}

export interface EncryptOption {
  algorithm?: string;
  saltLength?: number;
  iterations?: number;
}

