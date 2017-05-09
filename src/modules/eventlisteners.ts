/**
 * snabbdom 中对事件处理做了一层包装，真实 DOM 的事件触发的是对 VNode 的操作
 * 流程：
 * 1）createListner => 返回 handler 作为事件监听生成器 => handler 上绑定 vnode => 将 handler 作为真实 DOM 的事件处理器
 * 2）真实 DOM 事件触发后 => handler 获得真实 DOM 的事件对象 => 将真实 DOM 事件对象传入 handleEvent => handleEvent 找到
 *   对应的 vnode 事件处理器，然后调用这个处理器从而修改 vnode
 */

import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

// 对 vnode 进行事件处理
function invokeHandler(handler: any, vnode?: VNode, event?: Event): void {
  if (typeof handler === "function") {
    // call function handler
    // 如果 handler 是函数，则调用之。即：将事件处理器在 vnode 上调用。
    handler.call(vnode, event, vnode);
    // 如果 handler 是对象，则说明存在事件绑定数据或者存在多个事件处理器
  } else if (typeof handler === "object") {
    // call handler with arguments
    // 说明只有一个事件处理器
    // 如：handler === [fn, data] 或 handler === [fn, data1, data2, ...]
    if (typeof handler[0] === "function") {
      // special case for single argument for performance
      // 如果数组 handler 长度为 2，则第二个参数为 data，说明绑定数据只有一个，则直接将数据用 call 的方式调用，提高性能
      // 如 on：{click: [handler, data]}
      if (handler.length === 2) {
        handler[0].call(vnode, handler[1], event, vnode);
      } else {
        // 否则，说明有多个绑定数据，则要转化为数组，用 apply 的方式调用，而 apply 性能比 call 差
        // 如 on：{click: [handler, data1, data2, ...]}
        var args = handler.slice(1);
        args.push(event);
        args.push(vnode);
        handler[0].apply(vnode, args);
      }
    } else {
      // call multiple handlers
      // 如果存在多个相同事件的不同处理器，则递归调用
      // 如 on：{click: [[handler1, data1], [handler2, data2]]}
      for (var i = 0; i < handler.length; i++) {
        invokeHandler(handler[i]);
      }
    }
  }
}

function handleEvent(event: Event, vnode: VNode) {
  var name = event.type, // 事件类型，如：click
      on = (vnode.data as VNodeData).on; // 当前节点所注册的事件监听器

  // call event handler(s) if exists
  // 如果存在当前事件类型事件监听器，则通过 invokeHandler 处理调用之
  if (on && on[name]) {
    invokeHandler(on[name], vnode, event);
  }
}

// 创建事件监听器，用于处理真实 DOM 事件
function createListener() {
  /**
   * @param event 来自 dom 事件对象
   *
   * handler.vnode 来自 listener.vnode = vnode;，在事件处理器上绑定 vnode 引用
   */
  return function handler(event: Event) {
    handleEvent(event, (handler as any).vnode);
  }
}

/**
 * 更新事件监听器
 * @param oldVnode 老的节点数据
 * @param vnode 新的节点数据
 */
function updateEventListeners(oldVnode: VNode, vnode?: VNode): void {
  var oldOn = (oldVnode.data as VNodeData).on, // 老节点注册的事件回调
      oldListener = (oldVnode as any).listener, // 老节点事件监听器
      oldElm: Element = oldVnode.elm as Element, // 老节点元素
      on = vnode && (vnode.data as VNodeData).on, // 新节点注册的事件回调
      elm: Element = (vnode && vnode.elm) as Element, // 新节点元素
      name: string; // 事件类型

  // optimization for reused immutable handlers
  // 如果新旧节点注册的事件回调一样，则直接返回
  if (oldOn === on) {
    return;
  }

  // remove existing listeners which no longer used
  // 移除不再使用的事件监听器
  if (oldOn && oldListener) {
    // if element changed or deleted we remove all existing listeners unconditionally
    // 如果新节点上没有事件监听，则将旧节点上的事件监听都删除
    if (!on) {
      for (name in oldOn) {
        // remove listener if element was changed or existing listeners removed
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
      // 删除旧节点中新节点不存在的事件监听器
      for (name in oldOn) {
        // remove listener if existing listener removed
        if (!on[name]) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      }
    }
  }

  // add new listeners which has not already attached
  if (on) {
    // reuse existing listener or create new
    // 如果 oldVnode 上已经有 listener，则 vnode 直接复用，否则则新建事件处理器
    var listener = (vnode as any).listener = (oldVnode as any).listener || createListener();
    // update vnode for listener
    // 在事件处理器上绑定 vnode 引用
    listener.vnode = vnode;

    // if element changed or added we add all needed listeners unconditionally
    // 如果 oldVnode 上没有事件处理器
    if (!oldOn) {
      for (name in on) {
        // add listener if element was changed or new listeners added
        // 直接将 vnode 上的事件处理器添加到elm上
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        // add listener if new listener added
        // 否则添加 oldVnode 上没有的事件处理器
        if (!oldOn[name]) {
          elm.addEventListener(name, listener, false);
        }
      }
    }
  }
}

export const eventListenersModule = {
  create: updateEventListeners,
  update: updateEventListeners,
  destroy: updateEventListeners
} as Module;
export default eventListenersModule;