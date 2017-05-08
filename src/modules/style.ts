import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

// 如果存在 requestAnimationFrame，则直接使用，以优化性能，否则用 setTimeout 代替
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
// 执行下一帧
var nextFrame = function(fn: any) { raf(function() { raf(fn); }); };
// 通过 nextFrame 来实现动画效果
function setNextFrame(obj: any, prop: string, val: any): void {
  nextFrame(function() { obj[prop] = val; });
}

// 更新 style
// 如：{style: {fontWeight: 'bold'}}
function updateStyle(oldVnode: VNode, vnode: VNode): void {
  var cur: any, name: string, elm = vnode.elm,
      oldStyle = (oldVnode.data as VNodeData).style, // 老节点 style 数据
      style = (vnode.data as VNodeData).style; // 新节点 style 数据

  if (!oldStyle && !style) return; // 如果都不存在，则不操作
  if (oldStyle === style) return; // 如果没有变化，则不操作
  oldStyle = oldStyle || {};
  style = style || {};
  var oldHasDel = 'delayed' in oldStyle; // 判断老节点里是否有 delayed

  // 遍历老节点 style 数据
  for (name in oldStyle) {
    // 如果新节点中无 style[name]
    if (!style[name]) {
      // 如果属性名称以 '--' 开头，则移除此属性，否则将此属性置空
      if (name[0] === '-' && name[1] === '-') {
        (elm as any).style.removeProperty(name);
      } else {
        (elm as any).style[name] = '';
      }
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === 'delayed') {
      for (name in style.delayed) {
        cur = style.delayed[name];
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame((elm as any).style, name, cur);
        }
      }
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      if (name[0] === '-' && name[1] === '-') {
        (elm as any).style.setProperty(name, cur);
      } else {
        (elm as any).style[name] = cur;
      }
    }
  }
}

function applyDestroyStyle(vnode: VNode): void {
  var style: any, name: string, elm = vnode.elm, s = (vnode.data as VNodeData).style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    (elm as any).style[name] = style[name];
  }
}

function applyRemoveStyle(vnode: VNode, rm: () => void): void {
  var s = (vnode.data as VNodeData).style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  var name: string, elm = vnode.elm, i = 0, compStyle: CSSStyleDeclaration,
      style = s.remove, amount = 0, applied: Array<string> = [];
  for (name in style) {
    applied.push(name);
    (elm as any).style[name] = style[name];
  }
  compStyle = getComputedStyle(elm as Element);
  var props = (compStyle as any)['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  (elm as Element).addEventListener('transitionend', function (ev: TransitionEvent) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

// 导出接口 styleModule，接口类型为 Module
export const styleModule = {
  create: updateStyle,
  update: updateStyle,
  destroy: applyDestroyStyle,
  remove: applyRemoveStyle
} as Module;
export default styleModule;
