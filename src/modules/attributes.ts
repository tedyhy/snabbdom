import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

// 命名空间 URI
const NamespaceURIs = {
  "xlink": "http://www.w3.org/1999/xlink"
};

// 布尔值属性
const booleanAttrs = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "compact", "controls", "declare",
                "default", "defaultchecked", "defaultmuted", "defaultselected", "defer", "disabled", "draggable",
                "enabled", "formnovalidate", "hidden", "indeterminate", "inert", "ismap", "itemscope", "loop", "multiple",
                "muted", "nohref", "noresize", "noshade", "novalidate", "nowrap", "open", "pauseonexit", "readonly",
                "required", "reversed", "scoped", "seamless", "selected", "sortable", "spellcheck", "translate",
                "truespeed", "typemustmatch", "visible"];

// 初始化属性容器
const booleanAttrsDict: {[attribute: string]: boolean} = Object.create(null);

// 遍历属性，初始化每个属性值为 true
for (let i = 0, len = booleanAttrs.length; i < len; i++) {
  booleanAttrsDict[booleanAttrs[i]] = true;
}

/**
 * 更新节点 attrs
 * @param oldVnode 老的节点数据
 * @param vnode 新的节点数据
 */
function updateAttrs(oldVnode: VNode, vnode: VNode): void {
  var key: string, elm: Element = vnode.elm as Element,
      oldAttrs = (oldVnode.data as VNodeData).attrs, // 老节点 attrs 数据
      attrs = (vnode.data as VNodeData).attrs, // 新节点 attrs 数据
      namespaceSplit: Array<string>; // 命名空间

  if (!oldAttrs && !attrs) return; // 如果都不存在，则不操作
  if (oldAttrs === attrs) return; // 如果没有变化，则不操作
  oldAttrs = oldAttrs || {};
  attrs = attrs || {};

  // update modified attributes, add new attributes
  // 遍历属性，修改已存在属性值，新增不存在的属性
  for (key in attrs) {
    const cur = attrs[key];
    const old = oldAttrs[key];
    if (old !== cur) {
      if (booleanAttrsDict[key]) {
        if (cur) {
          elm.setAttribute(key, "");
        } else {
          elm.removeAttribute(key);
        }
      } else {
        namespaceSplit = key.split(":"); // 获取命名空间信息
        if (namespaceSplit.length > 1 && NamespaceURIs.hasOwnProperty(namespaceSplit[0])) {
          elm.setAttributeNS((NamespaceURIs as any)[namespaceSplit[0]], key, cur);
        } else {
          elm.setAttribute(key, cur);
        }
      }
    }
  }
  // remove removed attributes
  // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
  // the other option is to remove all attributes with value == undefined
  // 从元素节点上移除新 attrs 数据里不存在的 attrs
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}

export const attributesModule = {create: updateAttrs, update: updateAttrs} as Module;
export default attributesModule;
