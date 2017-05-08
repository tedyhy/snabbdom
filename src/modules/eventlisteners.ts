import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

function invokeHandler(handler: any, vnode?: VNode, event?: Event): void {
  if (typeof handler === "function") {
    // call function handler
    handler.call(vnode, event, vnode);
  } else if (typeof handler === "object") {
    // call handler with arguments
    if (typeof handler[0] === "function") {
      // special case for single argument for performance
      if (handler.length === 2) {
        handler[0].call(vnode, handler[1], event, vnode);
      } else {
        var args = handler.slice(1);
        args.push(event);
        args.push(vnode);
        handler[0].apply(vnode, args);
      }
    } else {
      // call multiple handlers
      for (var i = 0; i < handler.length; i++) {
        invokeHandler(handler[i]);
      }
    }
  }
}

function handleEvent(event: Event, vnode: VNode) {
  var name = event.type,
      on = (vnode.data as VNodeData).on;

  // call event handler(s) if exists
  if (on && on[name]) {
    invokeHandler(on[name], vnode, event);
  }
}

function createListener() {
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
  var oldOn = (oldVnode.data as VNodeData).on, // 老节点 on 监听的事件回调
      oldListener = (oldVnode as any).listener, // 老节点监听器
      oldElm: Element = oldVnode.elm as Element, // 老节点元素
      on = vnode && (vnode.data as VNodeData).on, // 新节点 on 监听的事件回调
      elm: Element = (vnode && vnode.elm) as Element, // 新节点元素
      name: string;

  // optimization for reused immutable handlers
  // 老节点 on 监听的事件回调和新的一致
  if (oldOn === on) {
    return;
  }

  // remove existing listeners which no longer used
  if (oldOn && oldListener) {
    // if element changed or deleted we remove all existing listeners unconditionally
    if (!on) {
      for (name in oldOn) {
        // remove listener if element was changed or existing listeners removed
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
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
    var listener = (vnode as any).listener = (oldVnode as any).listener || createListener();
    // update vnode for listener
    listener.vnode = vnode;

    // if element changed or added we add all needed listeners unconditionally
    if (!oldOn) {
      for (name in on) {
        // add listener if element was changed or new listeners added
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        // add listener if new listener added
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