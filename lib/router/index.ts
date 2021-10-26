import Router, { Middleware } from '@koa/router'
import Application from 'koa'
import { isBoolean, isFunction } from 'lodash'
import { LinRouterOptions, Meta } from '../types'
import { assert } from '../utils/util'

export const routeMetaInfo = new Map<string, Meta>()

function isMeta(meta?: Meta | Middleware<any, any>): meta is Meta {
  return typeof meta !== 'undefined' && typeof meta !== 'function'
}
/**
 * lin-router继承自koa-router
 * 即可使用全部的koa-router api
 * 也可使用以 lin 为前缀的方法，用于视图函数的权限
 */
export class LinRouter<StateT = Application.DefaultState, ContextT = Application.DefaultState> extends Router<StateT, ContextT> {
  private module?: string

  // 如果存在 permission，默认挂载之
  private mountPermission = true

  constructor(linRouterOptions?: LinRouterOptions) {
    super(linRouterOptions)
    if (linRouterOptions) {
      if (linRouterOptions.module) {
        this.module = linRouterOptions.module
      }
      if (isBoolean(linRouterOptions.mountPermission)) {
        this.mountPermission = linRouterOptions.mountPermission
      }
    }
  }

  /**
   * mount 为true，则会将meta信息记录在routeMetaInfo这个map中
   * @param permission 
   * @param mount 如果不传递，则取 this.mountPermission （默认为true），如果传递布尔值，则取传递的mount值
   * @returns 
   */
  permission(permission: string, mount?: boolean): Meta {
    return {
      permission,
      mount: isBoolean(mount) ? mount : this.mountPermission,
      module: this.module
    }
  }

  linOption(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'OPTION ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }
    if (isFunction(meta)) {
      return this.options(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.options(name, path, ...middleware)
  }

  linHead(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'HEAD ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }
    if (isFunction(meta)) {
      return this.head(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.head(name, path, ...middleware)
  }

  linGet(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'GET ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }
    if (isFunction(meta)) {
      return this.get(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.get(name, path, ...middleware)
  }

  linPatch(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'PATCH ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }
    if (isFunction(meta)) {
      return this.patch(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.patch(name, path, ...middleware)
  }

  linPut(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'PUT ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }
    if (isFunction(meta)) {
      return this.put(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.put(name, path, ...middleware)
  }

  linPost(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'POST ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }
    if (isFunction(meta)) {
      return this.post(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.post(name, path, ...middleware)
  }

  linDelete(name: string, path: string | RegExp, meta?: Meta | Middleware<StateT, ContextT>, ...middleware: Middleware<StateT, ContextT>[]) {
    // 强制使用命名路由
    if (isMeta(meta) && meta.mount) {
      assert(
        !!(meta.permission && meta.module),
        'permission and module must not be empty, if you want to mount'
      )
      const endpoint =  'DELETE ' + name
      routeMetaInfo.set(endpoint, { permission: meta.permission, module: meta.module })
    }

    if (isFunction(meta)) {
      return this.delete(name, path, meta as Middleware<StateT>, ...middleware)
    }

    return this.delete(name, path, ...middleware)
  }
}