import {Hooks} from './hooks';

// 定义 Key 类型为 string|number
export type Key = string | number;

// 定义接口 VNode
export interface VNode {
  sel: string | undefined;
  data: VNodeData | undefined;
  children: Array<VNode | string> | undefined;
  elm: Node | undefined;
  text: string | undefined;
  key: Key;
}

// 定义接口 VNodeData
export interface VNodeData {
  // modules - use any because Object type is useless
  props?: any; // 属性
  attrs?: any; // 属性
  class?: any; // 类
  style?: any; // 样式
  dataset?: any; // dataset 属性
  on?: any; // 事件监听器
  hero?: any;
  attachData?: any;
  hook?: Hooks;
  key?: Key;
  ns?: string; // for SVGs 命名空间
  fn?: () => VNode; // for thunks
  args?: Array<any>; // for thunks
  [key: string]: any; // for any other 3rd party module
  // end of modules
}

// 生成虚拟节点数据
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
