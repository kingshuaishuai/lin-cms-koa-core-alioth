import Router from '@koa/router'
import consola from 'consola'
import Application from 'koa'
import { get, isFunction, set } from 'lodash'
import { LinRouter } from '.'
import { config } from './config'
import { CodeMessageContainer } from './global-vars'
import { assert } from './utils/util'

export const __version__ = '0.0.1'

export class Lin {
  private app: Application | undefined

  initCodeMessage() {
    CodeMessageContainer.codeMessage = config.getItem('codeMessage', {})
    if (CodeMessageContainer.codeMessage && !isFunction(CodeMessageContainer.codeMessage.getMessage)) {
      throw new Error('CodeMessage.getMessage() must be implemented')
    }
  }

  initApp(app: Application<any, any>, mount?: boolean) {
    this.initCodeMessage()
    this.app = app
    assert(!!this.app, 'app must not be null')
    this.app.context.config = config
    mount && this.mount()
  }

  mount() {
    const pluginRp = new LinRouter({
      prefix: '/plugin'
    })
    Object.values(this.app!.context.plugins).forEach(plugin => {
      const controllers: Router[] = Object.values(get(plugin, 'controllers'))
      if (controllers.length > 1) {
        // 有多个controller的情况
        // 路由规则： /plugin/pluginName/controller路由前缀，controller就是路由
        controllers.forEach(cont => {
          // 给controller添加前缀
          set(
            cont,
            'opts.prefix',
            `/${get(plugin, 'name')}${get(cont, 'opts.prefix')}`
          )

          get(cont, 'stack', []).forEach(ly => {
            if (config.getItem('debug')) {
              consola.info(
                `loading a route: /plugin/${get(plugin, 'name')}${get(
                  ly,
                  'path'
                )}`
              )
            }
            set(ly, 'path', `/${get(plugin, 'name')}${get(ly, 'path')}`)
          })
          pluginRp
            .use(cont.routes())
            .use(cont.allowedMethods())
        })
      } else {
        // 只有一个plugin的情况
        controllers.forEach(cont => {
          if (config.getItem('debug')) {
            get(cont, 'stack', []).forEach(ly => {
              consola.info(`loading a route: /plugin${get(ly, 'path')}`)
            })
          }
          pluginRp
            .use(cont.routes())
            .use(cont.allowedMethods())
        })
      }
    })
    this.app!.use(pluginRp.routes()).use(pluginRp.allowedMethods())
  }
}