import vnode, {VNode} from './vnode';
import htmlDomApi, {DOMAPI} from './htmldomapi';

/**
 * 将 Node 节点转换成 VNode 节点
 * @param node 元素节点
 * @param domApi 对封装真实 DOM 操作的工具函数库，如果没有传入，默认使用 snabbdom 提供的 htmlDomApi
 * @returns {VNode}
 */
export function toVNode(node: Node, domApi?: DOMAPI): VNode {
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
  let text: string;
  // node 节点为元素节点
  if (api.isElement(node)) {
    const id = node.id ? '#' + node.id : ''; // 获取 id
    const cn = node.getAttribute('class'); // 获取 class
    const c = cn ? '.' + cn.split(' ').join('.') : ''; // 'a b c' => 'a.b.c'
    const sel = api.tagName(node).toLowerCase() + id + c; // 根据 node 的 tagName、id、class 生成 VNode.sel
    const attrs: any = {}; // 定义 VNodeData.attrs
    const children: Array<VNode> = []; // 定义 VNode.children
    let name: string;
    let i: number, n: number;
    const elmAttrs = node.attributes; // node 节点 attributes
    const elmChildren = node.childNodes; // node 节点 childNodes
    // 遍历 node 节点 attributes，将除了 id、class 的属性赋给 VNodeData.attrs
    for (i = 0, n = elmAttrs.length; i < n; i++) {
      name = elmAttrs[i].nodeName;
      if (name !== 'id' && name !== 'class') {
        attrs[name] = elmAttrs[i].nodeValue;
      }
    }
    // 遍历 node 节点 childNodes，递归将子节点转成 VNode 放入 VNode.children
    for (i = 0, n = elmChildren.length; i < n; i++) {
      children.push(toVNode(elmChildren[i]));
    }
    return vnode(sel, {attrs}, children, undefined, node);
  } else if (api.isText(node)) {
    // node 节点为 text 文本节点
    text = api.getTextContent(node) as string;
    return vnode(undefined, undefined, undefined, text, node);
  } else if (api.isComment(node)) {
    // node 节点为 comment 注释节点
    text = api.getTextContent(node) as string;
    return vnode('!', undefined, undefined, text, undefined);
  } else {
    return vnode('', {}, [], undefined, undefined);
  }
}

export default toVNode;