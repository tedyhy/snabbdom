// 判断是否是数组
export const array = Array.isArray;
// 判断是否是原始类型（string|number）
export function primitive(s: any): s is (string | number) {
  return typeof s === 'string' || typeof s === 'number';
}
