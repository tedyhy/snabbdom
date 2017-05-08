import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

/**
 * 更新节点 classList
 * @param oldVnode 老的节点数据
 * @param vnode 新的节点数据
 */
function updateClass(oldVnode: VNode, vnode: VNode): void {
  var cur: any, name: string, elm: Element = vnode.elm as Element,
      oldClass = (oldVnode.data as VNodeData).class, // 老节点 classList 数据
      klass = (vnode.data as VNodeData).class; // 新节点 classList 数据

  if (!oldClass && !klass) return; // 如果都不存在，则不操作
  if (oldClass === klass) return; // 如果没有变化，则不操作
  oldClass = oldClass || {};
  klass = klass || {};

  // 遍历老节点 classList，删除无用 class
  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  // 遍历新节点 classList，添加/删除 class
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      (elm.classList as any)[cur ? 'add' : 'remove'](name);
    }
  }
}

export const classModule = {create: updateClass, update: updateClass} as Module;
export default classModule;
