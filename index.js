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

function run() {
  var strHtml = `<p>今年早些时候，奇舞团开源的 Node.js 框架 ── <a href="https://thinkjs.org/">ThinkJS</a> 迎来了她的 3.0 版本。尽管今年我很少更新博客，但「每次 ThinkJS 发布大版本，我都要更新博客程序」的老传统还是不能丢。所以，你现在看到的这个博客，已经是基于 ThinkJS 3 全面重构后的新版。</p> <p>ThinkJS 3 基于 <a href="https://koajs.com">Koa</a> 2.x 开发，内核实现得非常小巧，框架通过 Middleware（兼容 Koa）、Adapter、Extend 等机制来扩展出强大而丰富的功能。按照惯例，ThinkJS 大版本之间无法平滑进行，但这次升级带来的工作量不算太大，本站的升级工作花了一下午全部完成。</p> <p>基于 ThinkJS 开发的网站普遍都很快，这篇文章我打算聊聊如何为 ThinkJS 3 网站优化 TTFB 时间，使之变得更快。</p> <p>Time to first byte（简称 TTFB）时间，又称首字节时间，是 WEB 性能优化中非常重要的指标。它代表着从浏览器发起 HTTP 请求到收到 HTTP 响应第一个字节的这段时间，包含了 DNS 解析、建立 TCP 连接、建立 SSL 连接、发送 HTTP 请求、网络传输、服务端处理、30X 重定向等阶段。在影响 TTFB 所有因素中，服务端程序何时输出响应决定了服务端处理时间的长短，也是本文关注的优化目标。</p> <p>优化 WEB 页面的 TTFB 时间除了要尽可能优化业务逻辑之外，还有两个常用技巧：</p> <ul> <li>多个 HTTP 请求响应（动静拆分）；</li> <li>一个 HTTP 请求多次响应（分块传输）；</li> </ul> <p>前者无非就是先尽快输出一个无服务端复杂逻辑的空壳页面，再发起 ajax、jsonp 等异步请求填充内容。这种方案不利于 SEO，比较适用于单页应用。</p> <p>像本站这种以内容为主的 Web 页面，非常适合采用第二个技巧来优化 TTFB 时间。本文重点介绍它。</p> <p>分块传输响应需要用到我之前介绍过的 <a href="https://imququ.com/post/transfer-encoding-header-in-http.html">HTTP Transfer-Encoding: chunked</a> 机制。有了这个机制，服务端可以随时将已经完成的部分响应发送给给客户端，而不必等待全部完成后再一次发送。浏览器拿到部分响应，就能解析并执行其中的 HTML、CSS 和 JS 代码，还能加载其中引用的子资源，最终让用户更快看到部分页面内容。分块传输也是 Facebook 在 2009 年实现的 Bigpipe 方案的理论基础，这里不再赘述。</p> <p>再来说说 ThinkJS。</p> <p>在 ThinkJS 之前几个版本中，我们可以通过 <code>http.write(content)</code> 发送多个 chunk，再通过 <code>http.end(content)</code> 发送最后一个 chunk，非常方便。</p> <p>而 ThinkJS 3 使用的 Koa 2.x，只能通过 <code>ctx.body</code> 设置并结束响应，意味着通常情况下响应只能发送一次，还得放在整个 Controller 流程的最后。</p> <p>通过分析代码，我找到在 ThinkJS 3 中多次发送响应的两种方案：</p> <ul> <li><code>ctx.body</code> 支持传入 Stream，创建 Readable 流 <code>rs</code> 并多次调用 <code>rs.push(content)</code> 可以多次发送 chunk，调用 <code>rs.push(null)</code> 可以结束响应；</li> <li>Koa 代码层面上并没有禁止我们使用 <code>ctx.res</code>，通过 <code>res</code> 对象可以完全控制响应；</li> </ul> <p>方案一比较正统；方案二则危险得多，官方都说要后果自负：</p> <blockquote> <p>Bypassing Koa&#39;s response handling is not supported. Avoid using the following node properties: res.statusCode, res.writeHead(), res.write(), res.end(). <a href="http://koajs.com/#ctx-res">via</a></p> </blockquote> <p>所以，本站最终采用了方案二。Koa 总共就几个文件，出啥奇怪的问题都不怕。</p> <p>下面开始贴代码。</p> <p>1）创建 Controller 的 Extend 文件 <code>src/extend/controller.js</code>：</p> <pre><code class="lang-javascript"><span class="hljs-keyword">const</span> firstChunkMinLength = <span class="hljs-number">4096</span>; <span class="hljs-built_in">module</span>.exports = { <span class="hljs-keyword">async</span> renderAndFlush(tpl) { <span class="hljs-keyword">let</span> content = <span class="hljs-keyword">await</span> <span class="hljs-keyword">this</span>.render(tpl); <span class="hljs-comment">//first chunk</span> <span class="hljs-keyword">if</span>(!<span class="hljs-keyword">this</span>.ctx.headerSent) { <span class="hljs-keyword">this</span>.ctx.type = <span class="hljs-string">'html'</span>; <span class="hljs-keyword">this</span>.ctx.flushHeaders(); <span class="hljs-keyword">let</span> length = content.length; <span class="hljs-keyword">if</span>(length &lt; firstChunkMinLength) { content += <span class="hljs-string">\`&lt;s&gt;<span class="hljs-subst">\${' '.repeat(firstChunkLength - length)}</span>&lt;/s&gt;\`</span>; } } <span class="hljs-keyword">this</span>.ctx.res.write(content); } }; </code></pre> <p>输出第一个 chunk 之前，需要通过 ctx 的 <code>type</code> setter 和 <code>flushHeaders</code> 方法来输出响应起始行和头部。</p> <p>第一个 chunk 不能太小，否则会被某些浏览器缓存起来，不会马上显示，达不到我们想要的效果。更多细节可以点开这个 <a href="https://stackoverflow.com/questions/16909227/using-transfer-encoding-chunked-how-much-data-must-be-sent-before-browsers-s">stackoverflow 的链接</a>自己看。另外，我在实际测试中发现，只补空格 iOS Safari 依然不会立刻渲染，把空格放在标签里就没问题。也可能是我的幻觉，欢迎大家测试并指正。</p> <p>2）在 Controller 里将原本渲染模板的逻辑根据实际情况拆分为多步：</p> <pre><code class="lang-javascript"><span class="hljs-keyword">async</span> indexAction() { <span class="hljs-keyword">let</span> pageName = <span class="hljs-string">'blog-home'</span>; <span class="hljs-keyword">let</span> title = <span class="hljs-string">'JerryQu 的小站'</span>; <span class="hljs-keyword">this</span>.assign({ pageName, title}); <span class="hljs-comment">//输出头部和边栏 HTML</span> <span class="hljs-keyword">await</span> <span class="hljs-keyword">this</span>.renderAndFlush(<span class="hljs-string">'home/inc/header'</span>); <span class="hljs-comment">//查询数据库（耗时操作）</span> <span class="hljs-keyword">let</span> pn = <span class="hljs-keyword">this</span>.get(<span class="hljs-string">'pn'</span>); <span class="hljs-keyword">let</span> data = <span class="hljs-keyword">await</span> <span class="hljs-keyword">this</span>.model(<span class="hljs-string">'post'</span>).getPostList(pn, <span class="hljs-number">10</span>); data.pagerPath = getPagerPath(<span class="hljs-keyword">this</span>.ctx, <span class="hljs-string">'pn'</span>); <span class="hljs-keyword">this</span>.assign(data); <span class="hljs-comment">//输出剩余 HTML</span> <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>.display(<span class="hljs-string">'home/index_post_list'</span>); } </code></pre> <p>也就是说需要提前发送的模板通过 renderAndFlush 来渲染并发送，剩余模板还是走原有的 display 逻辑。</p> <p>至此，本文要介绍的优化工作已经完成，赶紧打开浏览器验证一下吧。</p> <p>但是如果你照着我的代码改造，肯定会遇到不少坑，下面列举几个：</p> <p>1）原本的异常逻辑重定向到错误页不好用，直接提示 <code>Can&#39;t set headers after they are sent.</code> 错误。</p> <p>这个错误信息已经把原因描述得很明白，HTTP/1 的响应需要严格按照起始行、头部和正文的顺序发送，已经发送了正文，就不能再通过 30X 状态码和 <code>Location</code> 头部来跳转页面。</p> <p>解决方案：有一些会产生跳转的逻辑例如参数合法性检查，可以挪到发送第一个分块之前来进行。另一些异常跳转逻辑则无法提前，例如查询数据库后发现不存在对应的文章，这种情况可以输出一段 JS 代码在浏览器中跳转，或者直接渲染错误页面。</p> <p>2）提前输出的模板中部分变量取不到值。</p> <p>例如本站第一个分块输出了左侧内容，这个分块对应的模板中，有很多字段原本来自数据库查询后的结果，提前渲染必然取不到值。</p> <p>解决方案：这些需要用到数据库字段的逻辑，有一些可以挪到后续分块中；有一些则不好后移，例如需要动态赋值的页面 <code>&lt;title&gt;</code>，只能放在 <code>&lt;head&gt;</code> 里。一种方案是继续使用万能的 JS，通过后续分块中的 <code>docuemnt.title</code> 来给页面 title 赋值。对于不支持 JS 的 Spider，可以禁用提前输出响应策略。</p> <p>我使用了另外一套方案：由于文章数量不多，我索性在程序启动时，把全部文章 ID 和标题对应关系从数据库取出来，存在配置中。这样，后续第一个分块获取标题时无需查询数据库。</p> <p>下面这段代码需要放在 <code>src/bootstrap/worker.js</code>：</p> <pre><code class="lang-javascript"><span class="hljs-comment">//HTTP 服务启动前执行</span> think.beforeStartServer(<span class="hljs-keyword">async</span> () =&gt; { <span class="hljs-keyword">let</span> postTitle = {}; (<span class="hljs-keyword">await</span> think.model(<span class="hljs-string">'post'</span>).field([<span class="hljs-string">'slug'</span>, <span class="hljs-string">'title'</span>]).select()).forEach(item =&gt; { postTitle[item.slug] = item.title; }); think.config(<span class="hljs-string">'postTitle'</span>, postTitle); }); </code></pre> <p>3）Middleware 中获取到的 <code>ctx.body</code> 不是完整页面。</p> <p>本方案只有最后一个分块内容才会赋值给 <code>ctx.body</code>，前面分块的输出则完全绕过了 Middleware，出现这种情况是正常的。如果你不能接受，还是老老实实用 Readable Stream 吧。</p> <p>最后，看完本文，相信你对如何优化 ThinkJS 3 网站的 TTFB 时间有了足够了解，赶紧动手试试吧。遇到任何问题，欢迎留言讨论。</p> <p>本文链接：<a href="https://imququ.com/post/reduce-ttfb-on-thinkjs3-website.html">https://imququ.com/post/reduce-ttfb-on-thinkjs3-website.html</a>，<a href="https://imququ.com/post/reduce-ttfb-on-thinkjs3-website.html#comments" target="_blank">参与讨论</a></p>`;

  console.log(parse(strHtml));
}

run();


