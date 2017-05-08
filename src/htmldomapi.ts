// 定义接口 DOMAPI，里面包含了一系列跟 dom 相关属性或方法
// 对原生 DOM 操作的抽象
export interface DOMAPI {
  createElement: (tagName: any) => HTMLElement;
  createElementNS: (namespaceURI: string, qualifiedName: string) => Element;
  createTextNode: (text: string) => Text;
  createComment: (text: string) => Comment;
  insertBefore: (parentNode: Node, newNode: Node, referenceNode: Node | null) => void;
  removeChild: (node: Node, child: Node) => void;
  appendChild: (node: Node, child: Node) => void;
  parentNode: (node: Node) => Node;
  nextSibling: (node: Node) => Node;
  tagName: (elm: Element) => string;
  setTextContent: (node: Node, text: string | null) => void;
  getTextContent: (node: Node) => string | null;
  isElement: (node: Node) => node is Element;
  isText: (node: Node) => node is Text;
  isComment: (node: Node) => node is Comment;
}

// 创建元素，返回值类型为 HTMLElement
function createElement(tagName: any): HTMLElement {
  return document.createElement(tagName);
}

// 创建有命名空间的元素，返回值类型为 Element
function createElementNS(namespaceURI: string, qualifiedName: string): Element {
  return document.createElementNS(namespaceURI, qualifiedName);
}

// 创建文本节点，返回值类型为 Text
function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

// 创建注释节点，返回值类型为 Comment
function createComment(text: string): Comment {
  return document.createComment(text);
}

// 插入节点
function insertBefore(parentNode: Node, newNode: Node, referenceNode: Node | null): void {
  parentNode.insertBefore(newNode, referenceNode);
}

// 移除子节点
function removeChild(node: Node, child: Node): void {
  node.removeChild(child);
}

// 追加子节点
function appendChild(node: Node, child: Node): void {
  node.appendChild(child);
}

// 获取父节点
function parentNode(node: Node): Node | null {
  return node.parentNode;
}

// 获取下一个兄弟节点
function nextSibling(node: Node): Node | null {
  return node.nextSibling;
}

// 获取节点名称
function tagName(elm: Element): string {
  return elm.tagName;
}

// 设置节点文本内容
function setTextContent(node: Node, text: string | null): void {
  node.textContent = text;
}

// 获取节点文本内容
function getTextContent(node: Node): string | null {
  return node.textContent;
}

// 判断节点是否是元素节点
function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

// 判断节点是否是文本节点
function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

// 判断节点是否是注释节点
function isComment(node: Node): node is Comment {
  return node.nodeType === 8;
}

// htmlDomApi 对 DOMAPI 接口的实现
export const htmlDomApi = {
  createElement,
  createElementNS,
  createTextNode,
  createComment,
  insertBefore,
  removeChild,
  appendChild,
  parentNode,
  nextSibling,
  tagName,
  setTextContent,
  getTextContent,
  isElement,
  isText,
  isComment,
} as DOMAPI;

export default htmlDomApi;
