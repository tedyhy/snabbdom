/* global module, document, Node */
// snabbdom 核心，包含 diff，patch 等操作。snabbdom 译为"快"dom，snabb 瑞典语"快"的意思。

import {Module} from './modules/module';
import {Hooks} from './hooks';
import vnode, {VNode, VNodeData, Key} from './vnode';
import * as is from './is';
import htmlDomApi, {DOMAPI} from './htmldomapi';

// 判断传参 s 是否未定义
function isUndef(s: any): boolean { return s === undefined; }
// 判断传参 s 是否已定义
function isDef(s: any): boolean { return s !== undefined; }

// 定义类型 VNodeQueue
type VNodeQueue = Array<VNode>;

// 定义一个空的虚拟文本节点
const emptyNode = vnode('', {}, [], undefined, undefined);

// 判断两个节点是否相同
function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

// 判断节点是否是虚拟节点（VNode），通过 VNode.sel 来判断
function isVnode(vnode: any): vnode is VNode {
  return vnode.sel !== undefined;
}

// 定义类型 KeyToIndexMap
type KeyToIndexMap = {[key: string]: number};

// 定义泛型 ArraysOf<T>
type ArraysOf<T> = {
  [K in keyof T]: (T[K])[];
}

// 根据泛型 ArraysOf<Module> 定义类型 ModuleHooks
type ModuleHooks = ArraysOf<Module>;

// 将 oldVnode 数组中位置对 oldVnode.key 的映射转换为 oldVnode.key 对位置的映射
function createKeyToOldIdx(children: Array<VNode>, beginIdx: number, endIdx: number): KeyToIndexMap {
  let i: number, map: KeyToIndexMap = {}, key: Key, ch;
  // 遍历 children，索引从 beginIdx 到 endIdx
  for (i = beginIdx; i <= endIdx; ++i) {
    ch = children[i]; // 当前节点
    if (ch != null) {
      key = ch.key;
      // 如果当前节点有 key 属性，则把 VNode.key 与其当前索引对应起来，放入 map 中
      if (key !== undefined) map[key] = i;
    }
  }
  return map;
}

// 根据接口 Module 的 key 值生成 hooks 钩子数组数据
const hooks: (keyof Module)[] = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

// 导出接口 h、thunk
export {h} from './h';
export {thunk} from './thunk';

/**
 * snabbdom.init 方法
 * 根据模块初始化生成 patch 方法
 * Partial 参考 https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html
 *
 * @param modules 引入 init 依赖的模块
 * @param domApi 对封装真实 DOM 操作的工具函数库，如果没有传入，默认使用 snabbdom 提供的 htmlDomApi
 * @returns {(oldVnode:(VNode|Element), vnode:VNode)=>VNode}
 */
export function init(modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  let i: number, j: number, cbs = ({} as ModuleHooks);

  // 初始化 DOM API
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;

  // 注册全局钩子回调，在发生状态变更时，触发对应属性变更
  // 遍历 hooks，写入到 cbs 对象，并初始化
  for (i = 0; i < hooks.length; ++i) {
    // 如：cbs['create'] = [];
    cbs[hooks[i]] = [];
    // 遍历依赖模块 modules
    for (j = 0; j < modules.length; ++j) {
      // 以 './modules/style' 模块为例，如：const hook = style['create'];
      const hook = modules[j][hooks[i]];
      if (hook !== undefined) {
        // 如果 hook 存在，将此 hook 放入队列 cbs['create'] 中
        (cbs[hooks[i]] as Array<any>).push(hook);
      }
    }
  }

  // 将一个真实 DOM 节点转化成 VNode 形式
  // 如：<div id='a' class='b c'></div> => {sel:'div#a.b.c', data:{}, children:[], text:undefined, elm:<div id='a' class='b c'>}
  function emptyNodeAt(elm: Element) {
    const id = elm.id ? '#' + elm.id : '';
    const c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
  }

  // 需要 remove 一个 vnode 时，会触发 remove 钩子作拦截器，只有在所有 remove 钩子回调函数都触发完才会将节点从父节点删除，
  // 而这个函数提供的就是对 remove 钩子回调操作的计数功能
  function createRmCb(childElm: Node, listeners: number) {
    return function rmCb() {
      if (--listeners === 0) { // 如果 listeners === 0，则将此节点从父节点里删除
        const parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  // 根据 vnode 创建真实 DOM 节点
  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let i: any, data = vnode.data;
    if (data !== undefined) {
      // 当节点上存在 hook 而且 hook 中有 init 钩子时，先调用 init 回调，对刚创建的 vnode 进行处理
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode);
        // 获取 init 钩子修改后的数据
        data = vnode.data;
      }
    }
    let children = vnode.children, sel = vnode.sel;
    // 如果 vnode.sel === '!'，则此节点为注释节点
    if (sel === '!') {
      if (isUndef(vnode.text)) {
        vnode.text = ''; // 如果注释节点 vnode.text 未定义，则将其文本内容置为空
      }
      // 利用 DOM api 创建注释元素
      vnode.elm = api.createComment(vnode.text as string);
    } else if (sel !== undefined) {
      // Parse selector
      // 如果有 selector，则分析 VNode.sel
      // 例子：{sel: 'div#a.b.c'}
      const hashIdx = sel.indexOf('#'); // 3
      const dotIdx = sel.indexOf('.', hashIdx); // 5
      const hash = hashIdx > 0 ? hashIdx : sel.length; // 3
      const dot = dotIdx > 0 ? dotIdx : sel.length; // 5
      // 获取元素标签
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel; // 'div'
      // 创建真实 DOM 元素，如果有 vnode.data.ns，则创建带有命名空间的元素
      const elm = vnode.elm = isDef(data) && isDef(i = (data as VNodeData).ns) ? api.createElementNS(i, tag)
                                                                               : api.createElement(tag);
      // 获取 id
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      // 获取类名，并格式化，如：.a.b.c => 'a b c'
      if (dotIdx > 0) elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
      // 当 node 节点创建完毕后，触发全局 create 钩子回调
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      if (is.array(children)) {
        // 如果存在子元素 VNode 节点，则递归将子元素节点插入到当前 VNode 节点中，并将已插入的子元素节点在 insertedVnodeQueue 中作记录
        for (i = 0; i < children.length; ++i) {
          const ch = children[i];
          if (ch != null) {
            // 递归创建子节点并追加到父节点 elm
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue));
          }
        }
      } else if (is.primitive(vnode.text)) {
        // 如果子节点为原始类型（string|number），则创建文本节点
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      // 如果有当前 vnode 节点有 VNodeData.hook 钩子回调，则触发其 create 钩子回调
      // 如果有其有 insert 钩子回调，则将当前 vnode 推进 insertedVnodeQueue 中作记录，从而实现批量插入触发 insert 回调
      i = (vnode.data as VNodeData).hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      // 如果没声明选择器，则说明这个是一个 text 节点，则生成文本节点
      vnode.elm = api.createTextNode(vnode.text as string);
    }
    return vnode.elm;
  }

  /**
   * 将 vnode 转换后的 dom 节点插入到 dom 树的指定位置中去
   * @param parentElm 父节点
   * @param before  在哪个节点前插入
   * @param vnodes  要插入的节点集合
   * @param startIdx vnodes 里起始节点索引
   * @param endIdx vnodes 里结束节点索引
   * @param insertedVnodeQueue 批量插入触发 insert 回调队列
   */
  function addVnodes(parentElm: Node,
                     before: Node | null,
                     vnodes: Array<VNode>,
                     startIdx: number,
                     endIdx: number,
                     insertedVnodeQueue: VNodeQueue) {
    // 遍历 vnodes 里 startIdx 到 endIdx 的 vnode 节点，依次插入到 before 节点前
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (ch != null) {
        // 将新创建的 dom 插入到 before 节点前
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
      }
    }
  }

  // 手动触发 destory 钩子回调
  /**
   * 步骤：
   * 1）先调用 vnode 上的 destroy
   * 2）再调用全局下的 destroy
   * 3）递归调用子 vnode 的 destroy
   * @param vnode VNode 类型节点
   */
  function invokeDestroyHook(vnode: VNode) {
    let i: any, j: number, data = vnode.data;
    // 存在 VNode.data
    if (data !== undefined) {
      // 如果有 VNode.data.hook，而且有 destroy 钩子回调，则执行此钩子回调
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      // 先触发该节点上的 destroy 回调，然后触发全局下的 destroy 回调
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      // 如果此节点有子节点，则递归触发子节点的 destroy 回调
      if (vnode.children !== undefined) {
        for (j = 0; j < vnode.children.length; ++j) {
          i = vnode.children[j];
          if (i != null && typeof i !== "string") {
            // 递归执行
            invokeDestroyHook(i);
          }
        }
      }
    }
  }

  /**
   * 批量删除 DOM 节点
   * 步骤
   * 1）调用 invokeDestroyHook 以触发 destroy 回调
   * 2）调用 createRmCb 来开始对 remove 回调进行计数
   * 3）删除 DOM 节点
   * @param parentElm 父节点
   * @param vnodes 要删除的节点集合
   * @param startIdx vnodes 里起始节点索引
   * @param endIdx vnodes 里结束节点索引
   */
  function removeVnodes(parentElm: Node,
                        vnodes: Array<VNode>,
                        startIdx: number,
                        endIdx: number): void {
    // 遍历 vnodes 里 startIdx 到 endIdx 的 vnode 节点，依次删除
    for (; startIdx <= endIdx; ++startIdx) {
      let i: any, listeners: number, rm: () => void, ch = vnodes[startIdx];
      // 此 vnode 节点存在
      if (ch != null) {
        // 如果有 selector 选择器
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch); // 触发当前节点的 destroy 钩子回调
          listeners = cbs.remove.length + 1; // 对全局 remove 钩子回调进行计数
          rm = createRmCb(ch.elm as Node, listeners); // 对当前节点 remove 钩子回调进行计数
          // 调用全局 remove 回调函数，并每次减少一个 remove 钩子计数
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          // 调用内部 vnode.data.hook 中的 remove 钩子（只有一个）
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            // 如果没有内部 remove 钩子，需要调用 rm，确保能够 remove 节点
            rm();
          }
        } else { // Text node 删除文本节点
          api.removeChild(parentElm, ch.elm as Node);
        }
      }
    }
  }

  /**
   * 更新子节点
   * 对于同层的子节点，snabbdom 主要有删除、创建的操作，同时通过移位的方法，达到最大复用存在节点的目的，其中需要维护四个索引，分别是：
   * 1）oldStartIdx => 旧头索引
   * 2）oldEndIdx => 旧尾索引
   * 3）newStartIdx => 新头索引
   * 4）newEndIdx => 新尾索引
   *
   * @param parentElm 父节点
   * @param oldCh 老的子节点集合
   * @param newCh 新的子节点集合
   * @param insertedVnodeQueue
   */
  function updateChildren(parentElm: Node,
                          oldCh: Array<VNode>,
                          newCh: Array<VNode>,
                          insertedVnodeQueue: VNodeQueue) {
    let oldStartIdx = 0, newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx: any;
    let idxInOld: number;
    let elmToMove: VNode;
    let before: any;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm as Node, api.nextSibling(oldEndVnode.elm as Node));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm as Node, oldStartVnode.elm as Node);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }
        idxInOld = oldKeyToIdx[newStartVnode.key as string];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm as Node);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm as Node);
          } else {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            oldCh[idxInOld] = undefined as any;
            api.insertBefore(parentElm, (elmToMove.elm as Node), oldStartVnode.elm as Node);
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = newCh[newEndIdx+1] == null ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  /**
   * 真正对 vnode 内部进行 patch 操作
   * @param oldVnode 老节点 VNode
   * @param vnode 新节点 VNode
   * @param insertedVnodeQueue
   */
  function patchVnode(oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    let i: any, hook: any;
    // 在 patch 之前，先调用 vnode 节点的 prepatch 钩子
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode);
    }
    const elm = vnode.elm = (oldVnode.elm as Node); // 同步 vnode 节点 elm
    let oldCh = oldVnode.children; // oldVnode 节点子节点
    let ch = vnode.children; // vnode 节点子节点
    // 如果 oldvnode 和 vnode 的子节点集合引用相同，说明没发生任何变化直接返回，避免性能浪费
    // 如果 oldvnode 和 vnode 不同，说明 vnode 有更新
    if (oldVnode === vnode) return;
    // vnode 节点存在 data 数据
    if (vnode.data !== undefined) {
      // 先调用全局 update 钩子
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      // 然后调用 vnode.data 里面的 update 钩子
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    // vnode 不是 text 节点
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        // vnode 和 oldVnode 都有子节点
        // 如果 vnode 和 oldVnode 的子节点不同时，调用 updateChildren 去 diff 子节点，更新子节点
        if (oldCh !== ch) updateChildren(elm, oldCh as Array<VNode>, ch as Array<VNode>, insertedVnodeQueue);
      } else if (isDef(ch)) {
        // vnode 有子节点，oldVnode 没有子节点
        // 如果 oldVnode 是 text 节点，则将 elm 的 text 清除
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        // 并添加 vnode 的子节点到 elm 元素内
        addVnodes(elm, null, ch as Array<VNode>, 0, (ch as Array<VNode>).length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        // 如果 oldVnode 有子节点，而 vnode 没子节点，则移除 elm 的子节点
        removeVnodes(elm, oldCh as Array<VNode>, 0, (oldCh as Array<VNode>).length - 1);
      } else if (isDef(oldVnode.text)) {
        // 如果 vnode 和 oldVnode 都没有子节点，且 vnode 没 text，则删除 oldvnode 的 text
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      // 如果 oldvnode 的 text 和 vnode 的 text 不同，则 elm 的文本更新为 vnode 的 text
      api.setTextContent(elm, vnode.text as string);
    }
    // patch 完，触发 vnode 节点的 postpatch 钩子
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  /**
   * 首先我们需要明确的一个是，如果按照传统的 diff 算法，那么为了找到最小变化，需要逐层逐层的去搜索比较，这样时间复杂度将会达到 O(n^3) 的级别，
   * 代价十分高，考虑到节点变化很少是跨层次的，vdom 采取的是一种简化的思路，只比较同层节点，
   * 如果不同，那么即使该节点的子节点没变化，我们也不复用，直接将从父节点开始的子树全部删除，然后再重新创建节点添加到新的位置。
   * 如果父节点没变化，我们就比较所有同层的子节点，对这些子节点进行删除、创建、移位操作。
   * 有了这个思想，理解 patch 也十分简单了。patch 只需要对两个 vnode 进行判断是否相同，如果相同，则对他们进行 patchVnode 操作，否则直接用 vnode 替换 oldvnode。
   *
   * @param oldVnode [VNode | Element]
   * @param vnode [VNode]
   */
  return function patch(oldVnode: VNode | Element, vnode: VNode): VNode {
    let i: number, elm: Node, parent: Node;
    // 记录被插入的 vnode 队列，用于批量触发 insert 钩子回调
    const insertedVnodeQueue: VNodeQueue = [];
    // 调用全局 pre 钩子
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    // 判断节点是否是 VNode 节点，如果不是，则通过 emptyNodeAt 将一个真实 DOM 节点转化成 VNode 节点
    if (!isVnode(oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    // 判断 oldVnode 和 vnode 两个节点是否相同，如果相同，则调用 patchVnode 进行更新
    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      // 否则，将 vnode 插入，并将 oldvnode 从其父节点上直接删除
      elm = oldVnode.elm as Node; // oldVnode 对应真实的 DOM
      parent = api.parentNode(elm); // elm 元素的父节点

      // 根据 vnode 创建真实的 DOM
      createElm(vnode, insertedVnodeQueue); // 生成 vnode.elm

      // 如果 parent 存在，将 oldvnode 从其父节点上删除，将 vnode 插入 parent
      if (parent !== null) {
        api.insertBefore(parent, vnode.elm as Node, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    // 插入完后，调用每个被插入的 vnode 的 insert 钩子
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      (((insertedVnodeQueue[i].data as VNodeData).hook as Hooks).insert as any)(insertedVnodeQueue[i]);
    }
    // 然后调用全局 post 钩子
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    // 返回 vnode 用作下次 patch 的 oldvnode
    return vnode;
  };
}
