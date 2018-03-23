var htmlparser = require('htmlparser2');

var TAG_LIST = 'a|abbr|b|blockquote|br|code|col|colgroup|dd|del|div|dl|dt|em|fieldset|h1|h2|h3|h4|h5|h6|hr|i|img|ins|label|legend|li|ol|p|q|span|strong|sub|sup|table|tbody|td|tfoot|th|thead|tr|ul'.split('|');

function _getPrefix(level) {
  return new Array(level * 4 + 1).join('-');
}

/**
 * 解析出来的`node`结构一般如下：
 * ```
 * {
 *   data: 'xxxxx', // 数据
 *   type: 'text|tag', // 节点类型，文本或者Tag
 *   name: 'p|div|...', // html节点类型
 *   attribs: {}, // 属性列表
 *   children: [ [Object], [Object], [Object], .. ], // 子节点列表
 *   next: {
 *     type: 'text|tag',
 *     ..  
 *   },
 *   prev: {
 *     type: 'text|tag',
 *     .. 
 *   },
 *   parent: null
 * }
 * ```
 * @param {node} node - 要解析的DOM节点
 * @param {number} level - 初始层级数据
 * @return {object} 解析出来的符合微信小程序展示的节点列表
 */
function _parseNode(node, level) {
  if (node.type === 'text') {
    var data = node.data || '';
    data = data.trim();
    return !data ? null : {
      type: 'text',
      text: data,
    }
  }
  // 目前只认识`tag`和`text`两个标签，其他全部忽略
  if (node.type !== 'tag') {
    return null;
  }
  var name = node.name;
  // 小程序暂时不支持`pre`标签，所以用`div`替代
  if (name === 'pre') {
    name = 'div';
  }
  if (TAG_LIST.indexOf(name) < 0) {
    return null;
  }
  // `xnode`是小程序节点的数据结构
  var xnode = {
    // type: 'node', // 可以不写
    name: name,
    attrs: {
      class: 'rich-text-' + node.name
    },
    children: []
  };
  var attribs = node.attribs;
  if (name === 'img') {
    attribs.alt && (xnode.attrs.alt = attribs.alt);
    attribs.src && (xnode.attrs.src = attribs.src);
    attribs.src && (xnode.attrs['data-src'] = attribs.src);
  } else if (name === 'col' || name === 'colgroup') {
    attribs.span && (xnode.attrs.span = attribs.span);
  } else if (name === 'td' || name === 'th') {
    attribs.colspan && (xnode.attrs.colspan = attribs.colspan);
    attribs.rowspan && (xnode.attrs.rowspan = attribs.rowspan);
  }
  // 这里如果有`stackoverflow`的情况，可能要改成尾递归的方式
  var children = node.children;
  if (children && children.length > 0) {
    xnode.children = _parseNodeList(children, level + 1);
  }
  return xnode;
}
/**
 * 转换dom节点列表为小程序节点列表
 * @param [array] nodes - 要解析的DOM节点列表 
 * @param [number] level - 初始层级数据
 * @return {object} 解析出来的符合微信小程序展示的节点列表 
 */
function _parseNodeList(nodes, level) {
  if (!nodes || !nodes.length) {
    return [];
  }
  var result = [], i = 0, l = nodes.length, _node;
  for (; i < l; i += 1) {
    _node = _parseNode(nodes[i], level);
    _node && result.push(_node);
  }
  return result;
}

function parse(strHtml) {
  return new Promise(function (resolve, reject) {
    var parser = new htmlparser.Parser(
      new htmlparser.DomHandler(function (err, dom) {
        if (err) {
          reject(err);
        } else {
          try {
            var result = _parseNodeList(dom, 0);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }
      }, {
        normalizeWhitespace: true
      })
    );
    parser.write(strHtml);
    parser.end();
  });
  // var parser = new htmlparser.Parser(
  //   new htmlparser.DomHandler(function (err, dom) {
  //     var result = _parseNodeList(dom, 0);
  //   }, {
  //     normalizeWhitespace: true
  //   })
  // );
  // parser.write(strHtml);
  // parser.end();
}

exports.parse = parse;
