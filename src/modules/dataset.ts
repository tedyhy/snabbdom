import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

const CAPS_REGEX = /[A-Z]/g;

function updateDataset(oldVnode: VNode, vnode: VNode): void {
  let elm: HTMLElement = vnode.elm as HTMLElement,
    oldDataset = (oldVnode.data as VNodeData).dataset, // 老节点 dataset 数据
    dataset = (vnode.data as VNodeData).dataset, // 新节点 dataset 数据
    key: string;

  if (!oldDataset && !dataset) return; // 如果都不存在，则不操作
  if (oldDataset === dataset) return; // 如果没有变化，则不操作
  oldDataset = oldDataset || {};
  dataset = dataset || {};
  const d = elm.dataset;

  for (key in oldDataset) {
    if (!dataset[key]) {
      if (d) {
        delete d[key];
      } else {
        // 'aBC' => 'a-b-c'
        elm.removeAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase());
      }
    }
  }
  for (key in dataset) {
    if (oldDataset[key] !== dataset[key]) {
      if (d) {
        d[key] = dataset[key];
      } else {
        elm.setAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase(), dataset[key]);
      }
    }
  }
}

export const datasetModule = {create: updateDataset, update: updateDataset} as Module;
export default datasetModule;