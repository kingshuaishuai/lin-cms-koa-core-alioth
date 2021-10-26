import { ModelOptions } from 'sequelize'
import { PlainObject } from '../types'

export const ModelCommonConfig: {
  attributes: PlainObject
  options: ModelOptions
} = {
  attributes: {},
  options: {
    createdAt: 'create_time',
    updatedAt: 'update_time',
    deletedAt: 'delete_time',
    paranoid: true
  }
}

export interface BaseAttrs {
  create_time?: Date
  update_time?: Date
  delete_time?: Date
}