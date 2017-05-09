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
  // 遍历新节点 style 数据
  for (name in style) {
    cur = style[name]; // 当前 style[name] 值
    if (name === 'delayed') {
      // 如果是 'delayed' 属性，则遍历之
      for (name in style.delayed) {
        cur = style.delayed[name];
        // 如果老节点没有 'delayed' 属性，或者新节点与老节点值不同，则在下一帧将此样式属性值设为新值
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame((elm as any).style, name, cur);
        }
      }
      // 非 'delayed' 和 'remove' 的 style，而且不同于老节点中的值，则直接设置为新值
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      if (name[0] === '-' && name[1] === '-') {
        (elm as any).style.setProperty(name, cur);
      } else {
        (elm as any).style[name] = cur;
      }
    }
  }
}

// 设置节点被 destory 时的 style
function applyDestroyStyle(vnode: VNode): void {
  var style: any, name: string, elm = vnode.elm, s = (vnode.data as VNodeData).style;
  if (!s || !(style = s.destroy)) return;
  // 如果 vnode.data.style 有值，则更新 elm style
  for (name in style) {
    (elm as any).style[name] = style[name];
  }
}

// 应用删除效果，当我们删除一个元素时，先调用删除过渡效果，过渡完才会将节点 remove
function applyRemoveStyle(vnode: VNode, rm: () => void): void {
  // 获取 vnode.data.style 值
  var s = (vnode.data as VNodeData).style;
  // 如果没有 style 或没有 style.remove 局部钩子，则直接调用全局 reomve 钩子
  if (!s || !s.remove) {
    rm();
    return;
  }
  /**
   * CSSStyleDeclaration 类型
   * 参考
   * https://developer.mozilla.org/zh-CN/docs/Web/API/CSSStyleDeclaration
   */
  var name: string, elm = vnode.elm, i = 0, compStyle: CSSStyleDeclaration,
      style = s.remove, amount = 0, applied: Array<string> = [];
  // 设置并记录 remove 动作后删除节点前的样式
  for (name in style) {
    applied.push(name);
    (elm as any).style[name] = style[name];
  }
  compStyle = getComputedStyle(elm as Element);
  // 拿到所有需要过渡的属性
  var props = (compStyle as any)['transition-property'].split(', ');
  // 对过渡属性计数，这里 applied.length >= amount，因为有些属性是不需要过渡的
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  // 当过渡效果完成后，才 remove 节点，调用下一个 remove 过程
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
