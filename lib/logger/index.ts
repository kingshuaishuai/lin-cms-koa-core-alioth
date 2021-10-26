declare module 'egg-logger' {
  // 补充egg-logger中Transport缺少的参数
  interface Transport<T extends TransportOptions = TransportOptions> {
    options: T
    defaults: T
  }
}

export { ConsoleTransport } from './console'
export { FileTransport } from './file'