import {PreHook, CreateHook, UpdateHook, DestroyHook, RemoveHook, PostHook} from '../hooks';

// 定义接口 Module
export interface Module {
  pre: PreHook;
  create: CreateHook;
  update: UpdateHook;
  destroy: DestroyHook;
  remove: RemoveHook;
  post: PostHook;
}