import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

/**
 * 更新节点 props
 * @param oldVnode 老的节点数据
 * @param vnode 新的节点数据
 */
function updateProps(oldVnode: VNode, vnode: VNode): void {
  var key: string, cur: any, old: any, elm = vnode.elm,
      oldProps = (oldVnode.data as VNodeData).props, // 老节点 props 数据
      props = (vnode.data as VNodeData).props; // 新节点 props 数据

  if (!oldProps && !props) return; // 如果都不存在，则不操作
  if (oldProps === props) return; // 如果没有变化，则不操作
  oldProps = oldProps || {};
  props = props || {};

  // 遍历老节点 props，删除无用 props
  for (key in oldProps) {
    if (!props[key]) {
      delete (elm as any)[key];
    }
  }
  // 遍历新节点 props，添加/删除 props
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== 'value' || (elm as any)[key] !== cur)) {
      (elm as any)[key] = cur;
    }
  }
}

export const propsModule = {create: updateProps, update: updateProps} as Module;
export default propsModule;