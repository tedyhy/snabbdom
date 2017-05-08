import {vnode, VNode, VNodeData} from './vnode';
import * as is from './is';

// 为 SVGs 节点添加命名空间 ns
function addNS(data: any, children: Array<VNode> | undefined, sel: string | undefined): void {
  // 设置命名空间信息
  data.ns = 'http://www.w3.org/2000/svg';
  if (sel !== 'foreignObject' && children !== undefined) {
    // 如果此 svg 节点有子节点，则递归遍历之，为每个 svg 节点添加命名空间
    for (let i = 0; i < children.length; ++i) {
      let childData = children[i].data;
      if (childData !== undefined) {
        addNS(childData, (children[i] as VNode).children as Array<VNode>, children[i].sel);
      }
    }
  }
}

/**
 * 创建虚拟节点（vnodes）
 * h 方法重载（方法名相同，参数类型不同或者参数类型顺序不同）
 *
 * 如：
 * var vnode = h('div#container.two.classes', {on: {click: someFn}}, [
 *   h('span', {style: {fontWeight: 'bold'}}, 'This is bold'),
 *   ' and this is just normal text',
 *   h('a', {props: {href: '/foo'}}, 'I\'ll take you places!')
 * ]);
 * @param sel 即：selector
 */
export function h(sel: string): VNode;
export function h(sel: string, data: VNodeData): VNode;
export function h(sel: string, text: string): VNode;
export function h(sel: string, children: Array<VNode>): VNode;
export function h(sel: string, data: VNodeData, text: string): VNode;
export function h(sel: string, data: VNodeData, children: Array<VNode>): VNode;
export function h(sel: any, b?: any, c?: any): VNode {
  // data 默认为类型 VNodeData 的空对象
  var data: VNodeData = {}, children: any, text: any, i: number;
  // 如果此方法有 3 个传参，则第二个参数认为是 VNodeData 数据
  if (c !== undefined) {
    data = b;
    if (is.array(c)) { children = c; } // 如果传参 c 是数组，则为 children 数据
    else if (is.primitive(c)) { text = c; } // 如果传参 c 是原始数据（string|number），则为 text 数据
    else if (c && c.sel) { children = [c]; } // 如果传参 c 是一个对象，且存在 selector，则说明只有一个节点，则将其包装为数组
  } else if (b !== undefined) {
    if (is.array(b)) { children = b; } // 如果传参 b 是数组，则为 children 数据
    else if (is.primitive(b)) { text = b; } // 如果传参 b 是原始数据（string|number），则为 text 数据
    else if (b && b.sel) { children = [b]; } // 如果传参 b 是一个对象，且存在 selector，则说明只有一个节点，则将其包装为数组
    else { data = b; }
  }
  // 如果 children 是数组，就遍历之
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      // 如果此节点是原始类型数据（string|number），就为此节点创建一个函数，如：
      // ' and this is just normal text' => vnode(undefined, undefined, undefined, children[i])
      if (is.primitive(children[i])) children[i] = (vnode as any)(undefined, undefined, undefined, children[i]);
    }
  }
  // 判断元素节点是否是 svg。如：'svg#id.class'、'svg#id'、'svg.class'
  // 如果是 svg 节点，就添加命名空间 ns 属性
  if (
    sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
    (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
  ) {
    addNS(data, children, sel);
  }
  return vnode(sel, data, children, text, undefined);
};
export default h;
