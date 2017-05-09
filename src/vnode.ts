import {Hooks} from './hooks';

// 定义 Key 类型为 string|number
export type Key = string | number;

// 定义接口 VNode，规范虚拟节点数据格式
export interface VNode {
  sel: string | undefined; // selector 选择器，如：'div','div#a','div#a.b.c'
  data: VNodeData | undefined; // VNode 绑定的数据，可以有以下类型：attribute、props、eventlistner、class、dataset、hook
  children: Array<VNode | string> | undefined; // 子节点数组
  elm: Node | undefined; // 对真实 dom element 的引用
  text: string | undefined; // 当前节点 text 内容
  key: Key; // 用于不同 VNode 之间的比对
}

// 定义接口 VNodeData，规范 VNode.data 数据格式
export interface VNodeData {
  // modules - use any because Object type is useless
  props?: any; // 属性
  attrs?: any; // attributes 属性
  class?: any; // 类
  style?: any; // 样式
  dataset?: any; // dataset 属性
  on?: any; // 事件监听容器，形如：{click: [handler1, data1, ...], keyup: [handler2, data2]}
  hero?: any;
  attachData?: any;
  hook?: Hooks; // VNode 上的 hook 回调，规范来自 Hooks 接口。包括方法：pre|init|create|insert|prepatch|update|postpatch|destroy|remove|post。
  key?: Key; // 用于不同 VNode 之间的比对
  ns?: string; // for SVGs 命名空间
  fn?: () => VNode; // for thunks
  args?: Array<any>; // for thunks
  [key: string]: any; // for any other 3rd party module
  // end of modules
}

/**
 * 将传入的数据转化为 VNode 对象形式（虚拟节点数据）
 * @param sel selector 选择器
 * @param data 绑定的数据
 * @param children 子节点数组
 * @param text 当前节点 text 内容
 * @param elm 对真实 dom element 的引用
 * @returns {{sel: (string|undefined), data: (any|undefined), children: (Array<VNode|string>|undefined), text: (string|undefined), elm: (Element|Text|undefined), key: (string|number)}}
 */
export function vnode(sel: string | undefined,
                      data: any | undefined,
                      children: Array<VNode | string> | undefined,
                      text: string | undefined,
                      elm: Element | Text | undefined): VNode {
  let key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
}

export default vnode;
