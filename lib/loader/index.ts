import Application from 'koa'
import Router from '@koa/router'
import consola from 'consola'
import path from 'path'
import { Plugin } from '../plugin'
import { assert, getFiles } from '../utils/util'
import { config } from '../config'
import { get, set } from 'lodash'
import { Model } from 'sequelize'

export const disableLoading = Symbol('disableLoading')

function isRouter(val: any): val is Router {
  if (val && val instanceof Router) {
    return true
  }
  return false
}

export class Loader {
  public mainRouter: Router | undefined

  public pluginPath: { [key: string]: any }

  public app: Application

  public plugins: {[key: string]: Plugin} = {}

  constructor(pluginPath: { [key: string]: any }, app: Application) {
    assert(!!pluginPath, 'pluginPath must not be empty')
    this.pluginPath = pluginPath
    this.app = app
    this.loadMainApi()
    this.loadPlugins()
  }
  
  initLoader() {
    this.app.context.loader = this
    this.app.context.plugins = this.plugins
  }

  public loadPlugins() {
    const baseDir = config.getItem('baseDir', process.cwd())
    Object.keys(this.pluginPath).forEach(pluginName => {
      if (get(this.pluginPath, `${pluginName}.enable`)) {
        const pPath = get(this.pluginPath, `${pluginName}.path`)
        let confPath = ''
        const scriptType = config.getItem(`pluginPath.${pluginName}.scriptType`, 'js')
        const prod = process.env.NODE_ENV === 'production'
        if (prod || scriptType !== 'ts') {
          confPath = path.resolve(baseDir, pPath, 'config.js')
        } else {
          confPath = path.resolve(baseDir, pPath, 'config.ts')
        }
        const appPath = path.resolve(baseDir, pPath, 'app')
        const incomingConf = get(this.pluginPath, pluginName)
        this.loadConfig(pluginName, confPath, incomingConf)
        this.loadPlugin(pluginName, appPath)
      }
    })
  }

  /**
   * loadConfig 加载插件配置
   */
  public loadConfig(name: string, path: string, incomingConf: { [key: string]: any}) {
    const mod = require(path)
    const newConf = {}
    if (mod.default) {
      set(newConf, name, { ...mod.default, ...incomingConf })
    } else {
      set(newConf, name, { ...mod, ...incomingConf })
    }
    
    config.getConfigFromObj(newConf)
  }

  /**
   * loadPlugin 加载单个插件
   */
  public loadPlugin(name: string, path: string) {
    const mod = require(path)
    // const exports = get(mod, "default");
    const plugin = new Plugin(name)
    Object.keys(mod).forEach(key => {
      if (mod[key] instanceof Router) {
        plugin.addController(key, mod[key])
      } else if (mod[key] instanceof Model) {
        // 如果导出的模型继承自Model
        plugin.addModel(key, mod[key])
      }
    })
    this.plugins[name] = plugin
  }
  /**
   * 如果一个对象的属性为router，将其挂载到主路由上
   * @param modObj 
   * @param file 
   */
  private mountModRouters(modObj: any, file: string) {
    Object.keys(modObj).forEach((key: string) => {
      const r = modObj[key]
      if (isRouter(r)) {
        if (config.getItem('debug')) {
          consola.info(`loading a router instance from file: ${file}`)
          get(r, 'stack', []).forEach(ly => {
            consola.info(`loading a route: ${get(ly, 'path')}`)
          })
        }
        this.mainRouter!.use(r.routes()).use(r.allowedMethods())
      }
    })
  }
  /**
   * 加载主应用中的所有路由
   */
  public loadMainApi() {
    const mainRouter = new Router()
    this.mainRouter = mainRouter
    
    // 默认api的文件夹
    const apiDir = config.getItem('apiDir', 'app/api')
    const files = getFiles(apiDir)
    
    for (const file of files) {
      const modObj = require(file)
      let mod: Router | undefined

      // 获取router实例
      if (modObj.default && isRouter(modObj.default)) {
        mod = modObj.default
      } else if (isRouter(modObj)) {
        mod = modObj
      }
      // router实例存在进行挂载
      if (mod) {
        // debug模式打印日志
        if (config.getItem('debug')) {
          consola.info(`loading a router instance from file: ${file}`)
          get(mod, 'stack', []).forEach(ly => {
            consola.info(`loading a route: ${get(ly, 'path')}`)
          })
        }
        this.mainRouter.use(mod.routes()).use(mod.allowedMethods())
      } else if (modObj.default && !modObj.default[disableLoading] || !modObj.default && !modObj[disableLoading]) {
        // 如果disableLoading为true，则不加载这个文件路由
        this.mountModRouters(modObj, file)
        if (modObj.default) {
          this.mountModRouters(modObj.default, file)
        }
      }
    }
    this.app.use(this.mainRouter.routes()).use(this.mainRouter.allowedMethods())
  }
}