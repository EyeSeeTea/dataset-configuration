// @ts-nocheck
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/utils.js
var require_utils = __commonJS({
  "src/utils.js"(exports, module) {
    "use strict";
    var utils = {};
    ["forEach", "some", "every", "filter", "map"].forEach(function(fnName) {
      utils[fnName] = function(arr, fn, context) {
        if (!arr || typeof arr === "string") return arr;
        context = context || this;
        if (arr[fnName]) {
          return arr[fnName](fn, context);
        } else {
          var keys = Object.keys(arr);
          return keys[fnName](function(key) {
            return fn.call(context, arr[key], key, arr);
          }, context);
        }
      };
    });
    var number = 0;
    utils.guid = function() {
      return number++;
    };
    utils.mixin = function(to, from) {
      utils.forEach(from, function(val, key) {
        if (utils.isArray(val) || utils.isObject(val)) {
          to[key] = utils.mixin(val, to[key] || {});
        } else {
          to[key] = val;
        }
      });
      return to;
    };
    utils.isArray = function(obj) {
      return {}.toString.call(obj) === "[object Array]";
    };
    utils.isObject = function(obj) {
      return {}.toString.call(obj) === "[object Object]";
    };
    utils.indexOf = function(elem, arr) {
      if (utils.isArray(arr)) {
        return arr.indexOf(elem);
      }
    };
    utils.keys = Object.keys;
    utils.now = Date.now;
    module.exports = utils;
  }
});

// src/helper/text.js
var require_text = __commonJS({
  "src/helper/text.js"(exports, module) {
    module.exports = function(Helper, utils) {
      function getRefText(ast) {
        var ret2 = ast.leader;
        var isFn = ast.args !== void 0;
        if (ast.type === "macro_call") {
          ret2 = "#";
        }
        if (ast.isWraped) ret2 += "{";
        if (isFn) {
          ret2 += getMethodText(ast);
        } else {
          ret2 += ast.id;
        }
        utils.forEach(ast.path, function(ref) {
          if (ref.type == "method") {
            ret2 += "." + getMethodText(ref);
          } else if (ref.type == "index") {
            var text = "";
            var id = ref.id;
            if (id.type === "integer") {
              text = id.value;
            } else if (id.type === "string") {
              var sign = id.isEval ? '"' : "'";
              text = sign + id.value + sign;
            } else {
              text = getRefText(id);
            }
            ret2 += "[" + text + "]";
          } else if (ref.type == "property") {
            ret2 += "." + ref.id;
          }
        }, this);
        if (ast.isWraped) ret2 += "}";
        return ret2;
      }
      function getMethodText(ref) {
        var args = [];
        var ret2 = "";
        utils.forEach(ref.args, function(arg) {
          args.push(getLiteral(arg));
        });
        ret2 += ref.id + "(" + args.join(",") + ")";
        return ret2;
      }
      function getLiteral(ast) {
        var ret2 = "";
        switch (ast.type) {
          case "string": {
            var sign = ast.isEval ? '"' : "'";
            ret2 = sign + ast.value + sign;
            break;
          }
          case "integer":
          case "runt":
          case "bool": {
            ret2 = ast.value;
            break;
          }
          case "array": {
            ret2 = "[";
            var len = ast.value.length - 1;
            utils.forEach(ast.value, function(arg, i) {
              ret2 += getLiteral(arg);
              if (i !== len) ret2 += ", ";
            });
            ret2 += "]";
            break;
          }
          default:
            ret2 = getRefText(ast);
        }
        return ret2;
      }
      Helper.getRefText = getRefText;
    };
  }
});

// src/helper/index.js
var require_helper = __commonJS({
  "src/helper/index.js"(exports, module) {
    var Helper = {};
    var utils = require_utils();
    require_text()(Helper, utils);
    module.exports = Helper;
  }
});

// src/compile/methods.js
var require_methods = __commonJS({
  "src/compile/methods.js"(exports, module) {
    var utils = require_utils();
    function hasProperty(context, field) {
      if (typeof context === "number" || typeof context === "string") {
        return context[field] || Object.prototype.hasOwnProperty.call(context, field);
      }
      if (!context) {
        return false;
      }
      return field in context;
    }
    function matchProperty(value, notInContext) {
      return function({ property, context }) {
        return value === property && (notInContext ? !hasProperty(context, property) : true);
      };
    }
    function matchStartWith(value) {
      return function({ property, context }) {
        return property.indexOf(value) === 0 && !(property in context) && property.length > value.length;
      };
    }
    function getter(base, property) {
      if (typeof property === "number") {
        return base[property];
      }
      var letter = property.charCodeAt(0);
      var isUpper = letter < 91;
      var ret2 = base[property];
      if (ret2 !== void 0) {
        return ret2;
      }
      if (isUpper) {
        property = String.fromCharCode(letter).toLowerCase() + property.slice(1);
      }
      if (!isUpper) {
        property = String.fromCharCode(letter).toUpperCase() + property.slice(1);
      }
      return base[property];
    }
    function getSize(obj) {
      if (utils.isArray(obj)) {
        return obj.length;
      } else if (utils.isObject(obj)) {
        return utils.keys(obj).length;
      }
      return void 0;
    }
    var handlers = {
      // $foo.get('bar')
      get: {
        match: matchProperty("get", true),
        resolve: function({ context, params }) {
          return getter(context, params[0]);
        }
      },
      // $foo.set('a', 'b')
      set: {
        match: matchProperty("set", true),
        resolve: function({ context, params, property }) {
          context[params[0]] = params[1];
          return "";
        }
      },
      // getAddress()
      getValue: {
        match: matchStartWith("get"),
        resolve: function({ context, property }) {
          return getter(context, property.slice(3));
        }
      },
      isValue: {
        match: matchStartWith("is"),
        resolve: function({ context, property }) {
          return getter(context, property.slice(2));
        }
      },
      // $page.setName(123)
      setValue: {
        match: matchStartWith("set"),
        resolve: function({ context, property, params }) {
          context[property.slice(3)] = params[0];
          context.toString = function() {
            return "";
          };
          return context;
        }
      },
      keySet: {
        match: matchProperty("keySet", true),
        resolve: function({ context }) {
          return utils.keys(context);
        }
      },
      entrySet: {
        match: matchProperty("entrySet", true),
        resolve: function({ context }) {
          const ret2 = [];
          utils.forEach(context, function(value, key) {
            ret2.push({ key, value });
          });
          return ret2;
        }
      },
      size: {
        match: matchProperty("size", true),
        resolve: function({ context }) {
          return getSize(context);
        }
      },
      put: {
        match: matchProperty("put", true),
        resolve: function({ context, params }) {
          return context[params[0]] = params[1];
        }
      },
      add: {
        match: matchProperty("add", true),
        resolve: function({ context, params }) {
          if (typeof context.push !== "function") {
            return;
          }
          return context.push(params[0]);
        }
      },
      remove: {
        match: matchProperty("remove", true),
        resolve: function({ context, params }) {
          if (utils.isArray(context)) {
            let index;
            if (typeof index === "number") {
              index = params[0];
            } else {
              index = context.indexOf(params[0]);
            }
            ret = context[index];
            context.splice(index, 1);
            return ret;
          } else if (utils.isObject(context)) {
            ret = context[params[0]];
            delete context[params[0]];
            return ret;
          }
          return void 0;
        }
      },
      subList: {
        match: matchProperty("subList", true),
        resolve: function({ context, params }) {
          return context.slice(params[0], params[1]);
        }
      }
    };
    module.exports = utils.keys(handlers).map(function(key) {
      return {
        uid: "system: " + key,
        match: handlers[key].match,
        resolve: handlers[key].resolve
      };
    });
  }
});

// src/compile/blocks.js
var require_blocks = __commonJS({
  "src/compile/blocks.js"(exports, module) {
    "use strict";
    module.exports = function(Velocity, utils) {
      utils.mixin(Velocity.prototype, {
        getBlock: function(block) {
          var ast = block[0];
          var ret2 = "";
          switch (ast.type) {
            case "if":
              ret2 = this.getBlockIf(block);
              break;
            case "foreach":
              ret2 = this.getBlockEach(block);
              break;
            case "macro":
              this.setBlockMacro(block);
              break;
            case "noescape":
              ret2 = this._render(block.slice(1));
              break;
            case "define":
              this.setBlockDefine(block);
              break;
            case "macro_body":
              ret2 = this.getMacroBody(block);
              break;
            default:
              ret2 = this._render(block);
          }
          return ret2 || "";
        },
        /**
         * define
         */
        setBlockDefine: function(block) {
          var ast = block[0];
          var _block = block.slice(1);
          var defines = this.defines;
          defines[ast.id] = _block;
        },
        /**
         * define macro
         */
        setBlockMacro: function(block) {
          var ast = block[0];
          var _block = block.slice(1);
          var macros = this.macros;
          macros[ast.id] = {
            asts: _block,
            args: ast.args
          };
        },
        getMacroBody: function(asts) {
          const ast = asts[0];
          var _block = asts.slice(1);
          var bodyContent = this.eval(_block, {});
          return this.getMacro(ast, bodyContent);
        },
        /**
         * parse macro call
         */
        getMacro: function(ast, bodyContent) {
          var macro = this.macros[ast.id];
          var ret2 = "";
          if (!macro) {
            var jsmacros = this.jsmacros;
            macro = jsmacros[ast.id];
            var jsArgs = [];
            if (macro && macro.apply) {
              utils.forEach(ast.args, function(a) {
                jsArgs.push(this.getLiteral(a));
              }, this);
              var self = this;
              jsmacros.eval = function() {
                return self.eval.apply(self, arguments);
              };
              try {
                ret2 = macro.apply(jsmacros, jsArgs);
              } catch (e) {
                var pos = ast.pos;
                var text = Velocity.Helper.getRefText(ast);
                var err = "\n      at " + text + " L/N " + pos.first_line + ":" + pos.first_column;
                e.name = "";
                e.message += err;
                throw e;
              }
            }
          } else {
            var asts = macro.asts;
            var args = macro.args;
            var callArgs = ast.args;
            var local = { bodyContent };
            var guid = utils.guid();
            var contextId = "macro:" + ast.id + ":" + guid;
            utils.forEach(args, function(ref, i) {
              if (callArgs[i]) {
                local[ref.id] = this.getLiteral(callArgs[i]);
              } else {
                local[ref.id] = void 0;
              }
            }, this);
            ret2 = this.eval(asts, local, contextId);
          }
          return ret2;
        },
        /**
         * eval
         * @param str {array|string} input string
         * @param local {object} local variable
         * @param contextId {=string} optional contextId, this contextId use to find local variable
         * @return {string}
         */
        eval: function(str, local, contextId) {
          if (!local) {
            if (utils.isArray(str)) {
              return this._render(str);
            } else {
              return this.evalStr(str);
            }
          } else {
            var asts = [];
            var parse = Velocity.parse;
            contextId = contextId || "eval:" + utils.guid();
            if (utils.isArray(str)) {
              asts = str;
            } else if (parse) {
              asts = parse(str);
            }
            if (asts.length) {
              this.local[contextId] = local;
              var ret2 = this._render(asts, contextId);
              this.local[contextId] = {};
              this.conditions.shift();
              this.condition = this.conditions[0] || "";
              return ret2;
            }
          }
        },
        /**
         * parse #foreach
         */
        getBlockEach: function(block) {
          var ast = block[0];
          var tFrom = {};
          Object.assign(tFrom, ast.from, { pos: ast.pos });
          var _from = this.getLiteral(tFrom);
          var _block = block.slice(1);
          var _to = ast.to;
          var local = {
            foreach: {
              count: 0
            }
          };
          var ret2 = "";
          var guid = utils.guid();
          var contextId = "foreach:" + guid;
          var type = {}.toString.call(_from);
          if (!_from || type !== "[object Array]" && type !== "[object Object]") {
            return "";
          }
          if (utils.isArray(_from)) {
            var len = _from.length;
            utils.forEach(_from, function(val, i) {
              if (this._state.break) {
                return;
              }
              local[_to] = val;
              local.foreach = {
                count: i + 1,
                index: i,
                hasNext: i + 1 < len
              };
              local.velocityCount = i + 1;
              this.local[contextId] = local;
              ret2 += this._render(_block, contextId);
            }, this);
          } else {
            var len = utils.keys(_from).length;
            utils.forEach(utils.keys(_from), function(key, i) {
              if (this._state.break) {
                return;
              }
              local[_to] = _from[key];
              local.foreach = {
                count: i + 1,
                index: i,
                hasNext: i + 1 < len
              };
              local.velocityCount = i + 1;
              this.local[contextId] = local;
              ret2 += this._render(_block, contextId);
            }, this);
          }
          if (_from && _from.length) {
            this._state.break = false;
            this.local[contextId] = {};
            this.conditions.shift();
            this.condition = this.conditions[0] || "";
          }
          return ret2;
        },
        /**
         * parse #if
         */
        getBlockIf: function(block) {
          var received = false;
          var asts = [];
          utils.some(block, function(ast) {
            if (ast.condition) {
              if (received) {
                return true;
              }
              received = this.getExpression(ast.condition);
            } else if (ast.type === "else") {
              if (received) {
                return true;
              }
              received = true;
            } else if (received) {
              asts.push(ast);
            }
            return false;
          }, this);
          return this._render(asts, this.condition);
        }
      });
    };
  }
});

// src/compile/literal.js
var require_literal = __commonJS({
  "src/compile/literal.js"(exports, module) {
    "use strict";
    module.exports = function(Velocity, utils) {
      utils.mixin(Velocity.prototype, {
        /**
         * 字面量求值，主要包括string, integer, array, map四种数据结构
         * @param literal {object} 定义于velocity.yy文件，type描述数据类型，value属性
         * 是literal值描述
         * @return {object|string|number|array} js variable
         */
        getLiteral: function(literal) {
          var type = literal.type;
          var ret2 = "";
          if (type === "string") {
            ret2 = this.getString(literal);
          } else if (type === "integer") {
            ret2 = parseInt(literal.value, 10);
          } else if (type === "decimal") {
            ret2 = parseFloat(literal.value, 10);
          } else if (type === "array") {
            ret2 = this.getArray(literal);
          } else if (type === "map") {
            ret2 = {};
            var map = literal.value;
            utils.forEach(map, function(exp, key) {
              ret2[key] = this.getLiteral(exp);
            }, this);
          } else if (type === "bool") {
            if (literal.value === "null") {
              ret2 = null;
            } else if (literal.value === "false") {
              ret2 = false;
            } else if (literal.value === "true") {
              ret2 = true;
            }
          } else {
            ret2 = this.getReferences(literal);
          }
          return ret2;
        },
        /**
         * 对字符串求值，对已双引号字符串，需要做变量替换
         */
        getString: function(literal) {
          var val = literal.value;
          var ret2 = val;
          if (literal.isEval && (val.indexOf("#") !== -1 || val.indexOf("$") !== -1)) {
            ret2 = this.evalStr(val);
          }
          return ret2;
        },
        /**
         * 对array字面量求值，比如[1, 2]=> [1,2]，[1..5] => [1,2,3,4,5]
         * @param literal {object} array字面量的描述对象，分为普通数组和range数组两种
         * ，和js基本一致
         * @return {array} 求值得到的数组
         */
        getArray: function(literal) {
          var ret2 = [];
          if (literal.isRange) {
            var begin = literal.value[0];
            if (begin.type === "references") {
              begin = this.getReferences(begin);
            }
            var end = literal.value[1];
            if (end.type === "references") {
              end = this.getReferences(end);
            }
            end = parseInt(end, 10);
            begin = parseInt(begin, 10);
            var i;
            if (!isNaN(begin) && !isNaN(end)) {
              if (begin < end) {
                for (i = begin; i <= end; i++) ret2.push(i);
              } else {
                for (i = begin; i >= end; i--) ret2.push(i);
              }
            }
          } else {
            utils.forEach(literal.value, function(exp) {
              ret2.push(this.getLiteral(exp));
            }, this);
          }
          return ret2;
        },
        /**
         * 对双引号字符串进行eval求值，替换其中的变量，只支持最基本的变量类型替换
         */
        evalStr: function(str) {
          var asts = Velocity.parse(str);
          return this._render(asts, this.condition);
        }
      });
    };
  }
});

// src/compile/references.js
var require_references = __commonJS({
  "src/compile/references.js"(exports, module) {
    module.exports = function(Velocity, utils) {
      "use strict";
      function convert(str) {
        if (typeof str !== "string") return str;
        var result = "";
        var escape = false;
        var i, c, cstr;
        for (i = 0; i < str.length; i++) {
          c = str.charAt(i);
          if (" " <= c && c <= "~" || c === "\r" || c === "\n") {
            if (c === "&") {
              cstr = "&amp;";
              escape = true;
            } else if (c === '"') {
              cstr = "&quot;";
              escape = true;
            } else if (c === "<") {
              cstr = "&lt;";
              escape = true;
            } else if (c === ">") {
              cstr = "&gt;";
              escape = true;
            } else {
              cstr = c.toString();
            }
          } else {
            cstr = "&#" + c.charCodeAt().toString() + ";";
          }
          result = result + cstr;
        }
        return escape ? result : str;
      }
      var posUnknown = { first_line: "unknown", first_column: "unknown" };
      utils.mixin(Velocity.prototype, {
        /**
         * get variable value
         * @param {object} ast ast data
         * @param {bool} isVal for example `$foo`, isVal value should be true, other condition,
         * `#set($foo = $bar)`, the $bar value get, isVal set to false
         */
        getReferences: function(ast, isVal) {
          if (ast.prue) {
            var define = this.defines[ast.id];
            if (utils.isArray(define)) {
              return this._render(define);
            }
            if (ast.id in this.config.unescape) ast.prue = false;
          }
          var escape = this.config.escape;
          var isSilent = this.silence || ast.leader === "$!";
          var isfn = ast.args !== void 0;
          var context = this.context;
          var ret2 = context[ast.id];
          var local = this.getLocal(ast);
          var text = Velocity.Helper.getRefText(ast);
          if (text in context) {
            return ast.prue && escape ? convert(context[text]) : context[text];
          }
          if (ret2 !== void 0 && isfn) {
            ret2 = this.getPropMethod(ast, context, ast);
          }
          if (local.isLocaled) ret2 = local["value"];
          if (ast.path) {
            utils.some(
              ast.path,
              function(property, i, len) {
                if (ret2 === void 0) {
                  this._throw(ast, property);
                }
                ret2 = this.getAttributes(property, ret2, ast);
              },
              this
            );
          }
          if (isVal && ret2 === void 0) {
            ret2 = isSilent ? "" : Velocity.Helper.getRefText(ast);
          }
          ret2 = ast.prue && escape ? convert(ret2) : ret2;
          return ret2;
        },
        /**
         * 获取局部变量，在macro和foreach循环中使用
         */
        getLocal: function(ast) {
          var id = ast.id;
          var local = this.local;
          var ret2 = false;
          var isLocaled = utils.some(
            this.conditions,
            function(contextId) {
              var _local = local[contextId];
              if (id in _local) {
                ret2 = _local[id];
                return true;
              }
              return false;
            },
            this
          );
          return {
            value: ret2,
            isLocaled
          };
        },
        /**
         * $foo.bar 属性求值，最后面两个参数在用户传递的函数中用到
         * @param {object} property 属性描述，一个对象，主要包括id，type等定义
         * @param {object} baseRef 当前执行链结果，比如$a.b.c，第一次baseRef是$a,
         * 第二次是$a.b返回值
         * @private
         */
        getAttributes: function(property, baseRef, ast) {
          if (baseRef === null || baseRef === void 0) {
            return void 0;
          }
          var type = property.type;
          var ret2;
          var id = property.id;
          if (type === "method") {
            ret2 = this.getPropMethod(property, baseRef, ast);
          } else if (type === "property") {
            ret2 = baseRef[id];
          } else {
            ret2 = this.getPropIndex(property, baseRef);
          }
          return ret2;
        },
        /**
         * $foo.bar[1] index求值
         * @private
         */
        getPropIndex: function(property, baseRef) {
          var ast = property.id;
          var key;
          if (ast.type === "references") {
            key = this.getReferences(ast);
          } else if (ast.type === "integer") {
            key = ast.value;
          } else {
            key = ast.value;
          }
          return baseRef[key];
        },
        /**
         * $foo.bar()求值
         */
        getPropMethod: function(property, baseRef, ast) {
          var id = property.id;
          var ret2 = baseRef[id];
          var args = [];
          utils.forEach(
            property.args,
            function(exp) {
              args.push(this.getLiteral(exp));
            },
            this
          );
          const payload = { property: id, params: args, context: baseRef };
          var matched = this.customMethodHandlers.find(function(item) {
            return item && item.match(payload);
          });
          if (matched) {
            ret2 = matched.resolve(payload);
          } else {
            if (ret2 && ret2.call) {
              var that = this;
              if (typeof baseRef === "object" && baseRef) {
                baseRef.eval = function() {
                  return that.eval.apply(that, arguments);
                };
              }
              try {
                ret2 = ret2.apply(baseRef, args);
              } catch (e) {
                var pos = ast.pos || posUnknown;
                var text = Velocity.Helper.getRefText(ast);
                var err = " on " + text + " at L/N " + pos.first_line + ":" + pos.first_column;
                e.message += err;
                throw e;
              }
            } else {
              this._throw(ast, property, "TypeError");
              ret2 = void 0;
            }
          }
          return ret2;
        },
        _throw: function(ast, property, errorName) {
          if (this.config.env !== "development") {
            return;
          }
          var text = Velocity.Helper.getRefText(ast);
          var pos = ast.pos || posUnknown;
          var propertyName = property.type === "index" ? property.id.value : property.id;
          var errorMsg = "get property " + propertyName + " of undefined";
          if (errorName === "TypeError") {
            errorMsg = propertyName + " is not method";
          }
          errorMsg += "\n  at L/N " + text + " " + pos.first_line + ":" + pos.first_column;
          var e = new Error(errorMsg);
          e.name = errorName || "ReferenceError";
          throw e;
        }
      });
    };
  }
});

// src/compile/set.js
var require_set = __commonJS({
  "src/compile/set.js"(exports, module) {
    module.exports = function(Velocity, utils) {
      utils.mixin(Velocity.prototype, {
        /**
         * get variable from context, if run in block, return local context, else return global context
         */
        getContext: function(idName) {
          var local = this.local;
          for (var condition of this.conditions) {
            if (local[condition].hasOwnProperty(idName)) {
              return local[condition];
            }
          }
          return this.context;
        },
        /**
         * parse #set
         */
        setValue: function(ast) {
          var ref = ast.equal[0];
          var context = this.getContext(ref.id);
          if (this.condition && this.condition.indexOf("macro:") === 0) {
            context = this.context;
          }
          var valAst = ast.equal[1];
          var val;
          if (valAst.type === "math") {
            val = this.getExpression(valAst);
          } else {
            val = this.config.valueMapper(this.getLiteral(ast.equal[1]));
          }
          if (!ref.path) {
            context[ref.id] = val;
          } else {
            var baseRef = context[ref.id];
            if (typeof baseRef != "object") {
              baseRef = {};
            }
            context[ref.id] = baseRef;
            var len = ref.path ? ref.path.length : 0;
            const self = this;
            utils.some(ref.path, function(exp, i) {
              var isEnd = len === i + 1;
              var key = exp.id;
              if (exp.type === "index") {
                if (exp.id) {
                  key = self.getLiteral(exp.id);
                } else {
                  key = key.value;
                }
              }
              if (isEnd) {
                return baseRef[key] = val;
              }
              baseRef = baseRef[key];
              if (baseRef === void 0) {
                return true;
              }
            });
          }
        }
      });
    };
  }
});

// src/compile/expression.js
var require_expression = __commonJS({
  "src/compile/expression.js"(exports, module) {
    module.exports = function(Velocity, utils) {
      utils.mixin(Velocity.prototype, {
        /**
         * 表达式求值，表达式主要是数学表达式，逻辑运算和比较运算，到最底层数据结构，
         * 基本数据类型，使用 getLiteral求值，getLiteral遇到是引用的时候，使用
         * getReferences求值
         */
        getExpression: function(ast) {
          var exp = ast.expression;
          var ret2;
          if (ast.type === "math") {
            switch (ast.operator) {
              case "+":
                ret2 = this.getExpression(exp[0]) + this.getExpression(exp[1]);
                break;
              case "-":
                ret2 = this.getExpression(exp[0]) - this.getExpression(exp[1]);
                break;
              case "/":
                ret2 = this.getExpression(exp[0]) / this.getExpression(exp[1]);
                break;
              case "%":
                ret2 = this.getExpression(exp[0]) % this.getExpression(exp[1]);
                break;
              case "*":
                ret2 = this.getExpression(exp[0]) * this.getExpression(exp[1]);
                break;
              case "||":
                ret2 = this.getExpression(exp[0]) || this.getExpression(exp[1]);
                break;
              case "&&":
                ret2 = this.getExpression(exp[0]) && this.getExpression(exp[1]);
                break;
              case ">":
                ret2 = this.getExpression(exp[0]) > this.getExpression(exp[1]);
                break;
              case "<":
                ret2 = this.getExpression(exp[0]) < this.getExpression(exp[1]);
                break;
              case "==":
                ret2 = this.getExpression(exp[0]) == this.getExpression(exp[1]);
                break;
              case ">=":
                ret2 = this.getExpression(exp[0]) >= this.getExpression(exp[1]);
                break;
              case "<=":
                ret2 = this.getExpression(exp[0]) <= this.getExpression(exp[1]);
                break;
              case "!=":
                ret2 = this.getExpression(exp[0]) != this.getExpression(exp[1]);
                break;
              case "minus":
                ret2 = -this.getExpression(exp[0]);
                break;
              case "not":
                ret2 = !this.getExpression(exp[0]);
                break;
              case "parenthesis":
                ret2 = this.getExpression(exp[0]);
                break;
              default:
                return;
            }
            return ret2;
          } else {
            return this.getLiteral(ast);
          }
        }
      });
    };
  }
});

// src/compile/compile.js
var require_compile = __commonJS({
  "src/compile/compile.js"(exports, module) {
    module.exports = function(Velocity, utils) {
      utils.mixin(Velocity.prototype, {
        init: function() {
          this.context = {};
          this.macros = {};
          this.defines = {};
          this.conditions = [];
          this.local = {};
          this.silence = false;
          this.unescape = {};
          var self = this;
          this.directive = {
            stop: function() {
              self._state.stop = true;
              return "";
            }
          };
        },
        /**
         * @param context {object} context object
         * @param macro   {object} self defined #macro
         * @param silent {bool} 如果是true，$foo变量将原样输出
         * @return str
         */
        render: function(context, macros, silence) {
          this.silence = !!silence;
          this.context = context || {};
          this.jsmacros = utils.mixin(macros || {}, this.directive);
          var t1 = utils.now();
          var str = this._render();
          var t2 = utils.now();
          var cost = t2 - t1;
          this.cost = cost;
          return str;
        },
        /**
         * 解析入口函数
         * @param ast {array} 模板结构数组
         * @param contextId {number} 执行环境id，对于macro有局部作用域，变量的设置和
         * 取值，都放在一个this.local下，通过contextId查找
         * @return {string}解析后的字符串
         */
        _render: function(asts, contextId) {
          var str = "";
          asts = asts || this.asts;
          if (contextId) {
            if (contextId !== this.condition && utils.indexOf(contextId, this.conditions) === -1) {
              this.conditions.unshift(contextId);
            }
            this.condition = contextId;
          } else {
            this.condition = null;
          }
          utils.forEach(asts, function(ast) {
            if (this._state.stop === true) {
              return false;
            }
            switch (ast.type) {
              case "references":
                str += this.format(this.getReferences(ast, true));
                break;
              case "set":
                this.setValue(ast);
                break;
              case "break":
                this._state.break = true;
                break;
              case "macro_call":
                str += this.getMacro(ast);
                break;
              case "comment":
                break;
              case "raw":
                str += ast.value;
                break;
              default:
                str += typeof ast === "string" ? ast : this.getBlock(ast);
                break;
            }
          }, this);
          return str;
        },
        format: function(value) {
          if (utils.isArray(value)) {
            return "[" + value.map(this.format.bind(this)).join(", ") + "]";
          }
          if (utils.isObject(value)) {
            if (value.toString.toString().indexOf("[native code]") === -1) {
              return value;
            }
            var kvJoin = function(k) {
              return k + "=" + this.format(value[k]);
            }.bind(this);
            return "{" + Object.keys(value).map(kvJoin).join(", ") + "}";
          }
          return value;
        }
      });
    };
  }
});

// src/compile/index.js
var require_compile2 = __commonJS({
  "src/compile/index.js"(exports, module) {
    var utils = require_utils();
    var Helper = require_helper();
    var methods = require_methods();
    function Velocity(asts, config) {
      this.asts = asts;
      this.config = utils.mixin(
        {
          /**
           * if escapeHtml variable, is set true
           * $foo value will handle by escapeHtml
           */
          escape: false,
          // whiteList which no need escapeHtml
          unescape: {},
          valueMapper(value) {
            return value;
          }
        },
        config
      );
      this._state = { stop: false, break: false };
      this.customMethodHandlers = methods.concat(config ? config.customMethodHandlers : []);
      this.init();
    }
    Velocity.Helper = Helper;
    Velocity.prototype = {
      constructor: Velocity
    };
    require_blocks()(Velocity, utils);
    require_literal()(Velocity, utils);
    require_references()(Velocity, utils);
    require_set()(Velocity, utils);
    require_expression()(Velocity, utils);
    require_compile()(Velocity, utils);
    module.exports = Velocity;
  }
});

// src/parse/index.js
var require_parse = __commonJS({
  "src/parse/index.js"(exports, module) {
    var velocity = function() {
      var o = function(k, v, o2, l) {
        for (o2 = o2 || {}, l = k.length; l--; o2[k[l]] = v) ;
        return o2;
      }, $V0 = [1, 8], $V1 = [1, 9], $V2 = [1, 19], $V3 = [1, 10], $V4 = [1, 24], $V5 = [1, 25], $V6 = [1, 23], $V7 = [4, 10, 11, 20, 35, 36, 46, 83], $V8 = [1, 29], $V9 = [1, 34], $Va = [1, 30], $Vb = [1, 33], $Vc = [4, 10, 11, 20, 23, 35, 36, 39, 46, 49, 50, 51, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 83, 85, 94], $Vd = [1, 51], $Ve = [1, 56], $Vf = [1, 57], $Vg = [1, 74], $Vh = [1, 73], $Vi = [1, 86], $Vj = [1, 81], $Vk = [1, 89], $Vl = [1, 97], $Vm = [1, 92], $Vn = [1, 87], $Vo = [1, 96], $Vp = [1, 93], $Vq = [1, 94], $Vr = [4, 10, 11, 20, 23, 35, 36, 39, 46, 49, 50, 51, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 81, 83, 84, 85, 94], $Vs = [1, 109], $Vt = [1, 123], $Vu = [1, 119], $Vv = [1, 120], $Vw = [1, 133], $Vx = [23, 50, 85], $Vy = [2, 98], $Vz = [23, 39, 49, 50, 85], $VA = [23, 39, 49, 50, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 83, 85], $VB = [23, 39, 49, 50, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 83, 85, 96], $VC = [2, 111], $VD = [23, 39, 49, 50, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 83, 85, 94], $VE = [2, 114], $VF = [1, 142], $VG = [1, 148], $VH = [23, 49, 50], $VI = [1, 153], $VJ = [1, 154], $VK = [1, 155], $VL = [1, 156], $VM = [1, 157], $VN = [1, 158], $VO = [1, 159], $VP = [1, 160], $VQ = [1, 161], $VR = [1, 162], $VS = [1, 163], $VT = [1, 164], $VU = [1, 165], $VV = [23, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66], $VW = [50, 85], $VX = [2, 115], $VY = [23, 35], $VZ = [1, 215], $V_ = [1, 214], $V$ = [39, 50], $V01 = [23, 54, 55], $V11 = [23, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66], $V21 = [23, 54, 55, 61, 62, 63, 64, 65, 66];
      var parser = {
        trace: function trace() {
        },
        yy: {},
        symbols_: { "error": 2, "root": 3, "EOF": 4, "statements": 5, "statement": 6, "references": 7, "directives": 8, "content": 9, "RAW": 10, "COMMENT": 11, "set": 12, "if": 13, "elseif": 14, "else": 15, "end": 16, "foreach": 17, "break": 18, "define": 19, "HASH": 20, "NOESCAPE": 21, "PARENTHESIS": 22, "CLOSE_PARENTHESIS": 23, "macro": 24, "macro_call": 25, "macro_body": 26, "SET": 27, "equal": 28, "IF": 29, "expression": 30, "ELSEIF": 31, "ELSE": 32, "END": 33, "FOREACH": 34, "DOLLAR": 35, "ID": 36, "IN": 37, "MAP_BEGIN": 38, "MAP_END": 39, "array": 40, "BREAK": 41, "DEFINE": 42, "MACRO": 43, "macro_args": 44, "macro_call_args_all": 45, "MACRO_BODY": 46, "macro_call_args": 47, "literals": 48, "SPACE": 49, "COMMA": 50, "EQUAL": 51, "map": 52, "math": 53, "||": 54, "&&": 55, "+": 56, "-": 57, "*": 58, "/": 59, "%": 60, ">": 61, "<": 62, "==": 63, ">=": 64, "<=": 65, "!=": 66, "parenthesis": 67, "!": 68, "literal": 69, "brace_begin": 70, "attributes": 71, "brace_end": 72, "BOOL": 73, "methodbd": 74, "VAR_BEGIN": 75, "VAR_END": 76, "attribute": 77, "method": 78, "index": 79, "property": 80, "DOT": 81, "params": 82, "CONTENT": 83, "BRACKET": 84, "CLOSE_BRACKET": 85, "string": 86, "number": 87, "integer": 88, "INTEGER": 89, "DECIMAL_POINT": 90, "STRING": 91, "EVAL_STRING": 92, "range": 93, "RANGE": 94, "map_item": 95, "MAP_SPLIT": 96, "$accept": 0, "$end": 1 },
        terminals_: { 2: "error", 4: "EOF", 10: "RAW", 11: "COMMENT", 20: "HASH", 21: "NOESCAPE", 22: "PARENTHESIS", 23: "CLOSE_PARENTHESIS", 27: "SET", 29: "IF", 31: "ELSEIF", 32: "ELSE", 33: "END", 34: "FOREACH", 35: "DOLLAR", 36: "ID", 37: "IN", 38: "MAP_BEGIN", 39: "MAP_END", 41: "BREAK", 42: "DEFINE", 43: "MACRO", 46: "MACRO_BODY", 49: "SPACE", 50: "COMMA", 51: "EQUAL", 54: "||", 55: "&&", 56: "+", 57: "-", 58: "*", 59: "/", 60: "%", 61: ">", 62: "<", 63: "==", 64: ">=", 65: "<=", 66: "!=", 68: "!", 73: "BOOL", 75: "VAR_BEGIN", 76: "VAR_END", 81: "DOT", 83: "CONTENT", 84: "BRACKET", 85: "CLOSE_BRACKET", 89: "INTEGER", 90: "DECIMAL_POINT", 91: "STRING", 92: "EVAL_STRING", 94: "RANGE", 96: "MAP_SPLIT" },
        productions_: [0, [3, 1], [3, 2], [5, 1], [5, 2], [6, 1], [6, 1], [6, 1], [6, 1], [6, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 4], [8, 1], [8, 1], [8, 1], [12, 5], [13, 5], [14, 5], [15, 2], [16, 2], [17, 8], [17, 10], [17, 8], [17, 10], [18, 2], [19, 6], [24, 6], [24, 5], [44, 1], [44, 2], [25, 5], [25, 4], [26, 5], [26, 4], [47, 1], [47, 1], [47, 3], [47, 3], [47, 3], [47, 3], [45, 1], [45, 2], [45, 3], [45, 2], [28, 3], [30, 1], [30, 1], [30, 1], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 3], [53, 1], [53, 2], [53, 2], [53, 1], [53, 1], [67, 3], [7, 5], [7, 3], [7, 3], [7, 2], [7, 5], [7, 3], [7, 2], [7, 4], [7, 2], [7, 4], [70, 1], [70, 1], [72, 1], [72, 1], [71, 1], [71, 2], [77, 1], [77, 1], [77, 1], [78, 2], [74, 4], [74, 3], [82, 1], [82, 1], [82, 1], [82, 3], [82, 3], [80, 2], [80, 2], [79, 3], [79, 3], [79, 3], [79, 2], [79, 2], [69, 1], [69, 1], [69, 1], [87, 1], [87, 3], [87, 4], [88, 1], [88, 2], [86, 1], [86, 1], [48, 1], [48, 1], [48, 1], [40, 3], [40, 1], [40, 2], [93, 5], [93, 5], [93, 5], [93, 5], [52, 3], [52, 2], [95, 3], [95, 3], [95, 2], [95, 5], [95, 5], [9, 1], [9, 1], [9, 2], [9, 3], [9, 3], [9, 2]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
          var $0 = $$.length - 1;
          switch (yystate) {
            case 1:
              return [];
              break;
            case 2:
              return $$[$0 - 1];
              break;
            case 3:
            case 35:
            case 41:
            case 42:
            case 88:
            case 96:
            case 98:
              this.$ = [$$[$0]];
              break;
            case 4:
            case 36:
            case 89:
              this.$ = [].concat($$[$0 - 1], $$[$0]);
              break;
            case 5:
              $$[$0]["prue"] = true;
              $$[$0].pos = this._$;
              this.$ = $$[$0];
              break;
            case 6:
              $$[$0].pos = this._$;
              this.$ = $$[$0];
              break;
            case 7:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 19:
            case 20:
            case 21:
            case 47:
            case 48:
            case 52:
            case 53:
            case 54:
            case 68:
            case 71:
            case 72:
            case 84:
            case 85:
            case 86:
            case 87:
            case 93:
            case 101:
            case 108:
            case 109:
            case 114:
            case 120:
            case 122:
            case 135:
            case 136:
              this.$ = $$[$0];
              break;
            case 8:
              this.$ = { type: "raw", value: $$[$0] };
              break;
            case 9:
              this.$ = { type: "comment", value: $$[$0] };
              break;
            case 18:
              this.$ = { type: "noescape" };
              break;
            case 22:
              this.$ = { type: "set", equal: $$[$0 - 1] };
              break;
            case 23:
              this.$ = { type: "if", condition: $$[$0 - 1] };
              break;
            case 24:
              this.$ = { type: "elseif", condition: $$[$0 - 1] };
              break;
            case 25:
              this.$ = { type: "else" };
              break;
            case 26:
              this.$ = { type: "end" };
              break;
            case 27:
            case 29:
              this.$ = { type: "foreach", to: $$[$0 - 3], from: $$[$0 - 1] };
              break;
            case 28:
            case 30:
              this.$ = { type: "foreach", to: $$[$0 - 4], from: $$[$0 - 1] };
              break;
            case 31:
              this.$ = { type: $$[$0] };
              break;
            case 32:
              this.$ = { type: "define", id: $$[$0 - 1] };
              break;
            case 33:
              this.$ = { type: "macro", id: $$[$0 - 2], args: $$[$0 - 1] };
              break;
            case 34:
              this.$ = { type: "macro", id: $$[$0 - 1] };
              break;
            case 37:
              this.$ = { type: "macro_call", id: $$[$0 - 3].replace(/^\s+|\s+$/g, ""), args: $$[$0 - 1] };
              break;
            case 38:
              this.$ = { type: "macro_call", id: $$[$0 - 2].replace(/^\s+|\s+$/g, "") };
              break;
            case 39:
              this.$ = { type: "macro_body", id: $$[$0 - 3], args: $$[$0 - 1] };
              break;
            case 40:
              this.$ = { type: "macro_body", id: $$[$0 - 2] };
              break;
            case 43:
            case 44:
            case 45:
            case 46:
            case 99:
            case 100:
              this.$ = [].concat($$[$0 - 2], $$[$0]);
              break;
            case 49:
            case 50:
            case 103:
            case 104:
              this.$ = $$[$0 - 1];
              break;
            case 51:
              this.$ = [$$[$0 - 2], $$[$0]];
              break;
            case 55:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: "||" };
              break;
            case 56:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: "&&" };
              break;
            case 57:
            case 58:
            case 59:
            case 60:
            case 61:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: $$[$0 - 1] };
              break;
            case 62:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: ">" };
              break;
            case 63:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: "<" };
              break;
            case 64:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: "==" };
              break;
            case 65:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: ">=" };
              break;
            case 66:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: "<=" };
              break;
            case 67:
              this.$ = { type: "math", expression: [$$[$0 - 2], $$[$0]], operator: "!=" };
              break;
            case 69:
              this.$ = { type: "math", expression: [$$[$0]], operator: "minus" };
              break;
            case 70:
              this.$ = { type: "math", expression: [$$[$0]], operator: "not" };
              break;
            case 73:
              this.$ = { type: "math", expression: [$$[$0 - 1]], operator: "parenthesis" };
              break;
            case 74:
              this.$ = { type: "references", id: $$[$0 - 2], path: $$[$0 - 1], isWraped: true, leader: $$[$0 - 4] };
              break;
            case 75:
            case 76:
              this.$ = { type: "references", id: $$[$0 - 1], path: $$[$0], leader: $$[$0 - 2] };
              break;
            case 77:
            case 80:
              this.$ = { type: "references", id: $$[$0], leader: $$[$0 - 1] };
              break;
            case 78:
              this.$ = { type: "references", id: $$[$0 - 2].id, path: $$[$0 - 1], isWraped: true, leader: $$[$0 - 4], args: $$[$0 - 2].args };
              break;
            case 79:
              this.$ = { type: "references", id: $$[$0 - 1].id, path: $$[$0], leader: $$[$0 - 2], args: $$[$0 - 1].args };
              break;
            case 81:
              this.$ = { type: "references", id: $$[$0 - 1], isWraped: true, leader: $$[$0 - 3] };
              break;
            case 82:
              this.$ = { type: "references", id: $$[$0].id, leader: $$[$0 - 1], args: $$[$0].args };
              break;
            case 83:
              this.$ = { type: "references", id: $$[$0 - 1].id, isWraped: true, args: $$[$0 - 1].args, leader: $$[$0 - 3] };
              break;
            case 90:
              this.$ = { type: "method", id: $$[$0].id, args: $$[$0].args };
              break;
            case 91:
              this.$ = { type: "index", id: $$[$0] };
              break;
            case 92:
              this.$ = { type: "property", id: $$[$0] };
              if ($$[$0].type === "content") this.$ = $$[$0];
              break;
            case 94:
              this.$ = { id: $$[$0 - 3], args: $$[$0 - 1] };
              break;
            case 95:
              this.$ = { id: $$[$0 - 2], args: false };
              break;
            case 97:
              this.$ = [{ type: "runt", value: $$[$0] }];
              break;
            case 102:
              this.$ = { type: "content", value: $$[$0 - 1] + $$[$0] };
              break;
            case 105:
              this.$ = { type: "content", value: $$[$0 - 2] + $$[$0 - 1].value + $$[$0] };
              break;
            case 106:
            case 107:
              this.$ = { type: "content", value: $$[$0 - 1] + $$[$0] };
              break;
            case 110:
              this.$ = { type: "bool", value: $$[$0] };
              break;
            case 111:
              this.$ = { type: "integer", value: $$[$0] };
              break;
            case 112:
              this.$ = { type: "decimal", value: +($$[$0 - 2] + "." + $$[$0]) };
              break;
            case 113:
              this.$ = { type: "decimal", value: -($$[$0 - 2] + "." + $$[$0]) };
              break;
            case 115:
              this.$ = -parseInt($$[$0], 10);
              break;
            case 116:
              this.$ = { type: "string", value: $$[$0] };
              break;
            case 117:
              this.$ = { type: "string", value: $$[$0], isEval: true };
              break;
            case 118:
            case 119:
              this.$ = $$[$0];
              break;
            case 121:
              this.$ = { type: "array", value: $$[$0 - 1] };
              break;
            case 123:
              this.$ = { type: "array", value: [] };
              break;
            case 124:
            case 125:
            case 126:
            case 127:
              this.$ = { type: "array", isRange: true, value: [$$[$0 - 3], $$[$0 - 1]] };
              break;
            case 128:
              this.$ = { type: "map", value: $$[$0 - 1] };
              break;
            case 129:
              this.$ = { type: "map" };
              break;
            case 130:
            case 131:
              this.$ = {};
              this.$[$$[$0 - 2].value] = $$[$0];
              break;
            case 132:
              this.$ = {};
              this.$[$$[$0 - 1].value] = $$[$01];
              break;
            case 133:
            case 134:
              this.$ = $$[$0 - 4];
              this.$[$$[$0 - 2].value] = $$[$0];
              break;
            case 137:
            case 140:
              this.$ = $$[$0 - 1] + $$[$0];
              break;
            case 138:
              this.$ = $$[$0 - 2] + $$[$0 - 1] + $$[$0];
              break;
            case 139:
              this.$ = $$[$0 - 2] + $$[$0 - 1];
              break;
          }
        },
        table: [{ 3: 1, 4: [1, 2], 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: $V0, 11: $V1, 12: 11, 13: 12, 14: 13, 15: 14, 16: 15, 17: 16, 18: 17, 19: 18, 20: $V2, 24: 20, 25: 21, 26: 22, 35: $V3, 36: $V4, 46: $V5, 83: $V6 }, { 1: [3] }, { 1: [2, 1] }, { 4: [1, 26], 6: 27, 7: 5, 8: 6, 9: 7, 10: $V0, 11: $V1, 12: 11, 13: 12, 14: 13, 15: 14, 16: 15, 17: 16, 18: 17, 19: 18, 20: $V2, 24: 20, 25: 21, 26: 22, 35: $V3, 36: $V4, 46: $V5, 83: $V6 }, o($V7, [2, 3]), o($V7, [2, 5]), o($V7, [2, 6]), o($V7, [2, 7]), o($V7, [2, 8]), o($V7, [2, 9]), { 36: $V8, 38: $V9, 70: 28, 73: $Va, 74: 31, 75: $Vb, 83: [1, 32] }, o($V7, [2, 10]), o($V7, [2, 11]), o($V7, [2, 12]), o($V7, [2, 13]), o($V7, [2, 14]), o($V7, [2, 15]), o($V7, [2, 16]), o($V7, [2, 17]), { 21: [1, 35], 27: [1, 38], 29: [1, 39], 31: [1, 40], 32: [1, 41], 33: [1, 42], 34: [1, 43], 36: [1, 37], 41: [1, 44], 42: [1, 45], 43: [1, 46], 83: [1, 36] }, o($V7, [2, 19]), o($V7, [2, 20]), o($V7, [2, 21]), o($V7, [2, 135]), o($V7, [2, 136]), { 36: [1, 47] }, { 1: [2, 2] }, o($V7, [2, 4]), { 36: [1, 48], 74: 49 }, o($Vc, [2, 80], { 71: 50, 77: 52, 78: 53, 79: 54, 80: 55, 22: $Vd, 81: $Ve, 84: $Vf }), o($Vc, [2, 77], { 77: 52, 78: 53, 79: 54, 80: 55, 71: 58, 81: $Ve, 84: $Vf }), o($Vc, [2, 82], { 77: 52, 78: 53, 79: 54, 80: 55, 71: 59, 81: $Ve, 84: $Vf }), o($V7, [2, 140]), { 36: [2, 84] }, { 36: [2, 85] }, { 22: [1, 60] }, o($V7, [2, 137]), { 4: [1, 62], 22: [1, 63], 83: [1, 61] }, { 22: [1, 64] }, { 22: [1, 65] }, { 22: [1, 66] }, o($V7, [2, 25]), o($V7, [2, 26]), { 22: [1, 67] }, o($V7, [2, 31]), { 22: [1, 68] }, { 22: [1, 69] }, { 22: [1, 70] }, { 22: $Vd, 39: $Vg, 71: 71, 72: 72, 76: $Vh, 77: 52, 78: 53, 79: 54, 80: 55, 81: $Ve, 84: $Vf }, { 39: $Vg, 71: 75, 72: 76, 76: $Vh, 77: 52, 78: 53, 79: 54, 80: 55, 81: $Ve, 84: $Vf }, o($Vc, [2, 75], { 78: 53, 79: 54, 80: 55, 77: 77, 81: $Ve, 84: $Vf }), { 7: 82, 23: [1, 79], 35: $Vi, 36: $Vj, 38: $Vk, 40: 83, 48: 80, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 82: 78, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, o($Vr, [2, 88]), o($Vr, [2, 90]), o($Vr, [2, 91]), o($Vr, [2, 92]), { 36: [1, 99], 74: 98, 83: [1, 100] }, { 7: 102, 35: $Vi, 57: $Vl, 69: 101, 73: $Vm, 83: [1, 103], 85: [1, 104], 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, o($Vc, [2, 76], { 78: 53, 79: 54, 80: 55, 77: 77, 81: $Ve, 84: $Vf }), o($Vc, [2, 79], { 78: 53, 79: 54, 80: 55, 77: 77, 81: $Ve, 84: $Vf }), { 23: [1, 105] }, o($V7, [2, 138]), o($V7, [2, 139]), { 7: 111, 23: [1, 107], 35: $Vi, 38: $Vk, 40: 83, 45: 106, 47: 108, 48: 110, 49: $Vs, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 7: 113, 28: 112, 35: $Vi }, { 7: 121, 22: $Vt, 30: 114, 35: $Vi, 38: $Vk, 40: 115, 52: 116, 53: 117, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 7: 121, 22: $Vt, 30: 124, 35: $Vi, 38: $Vk, 40: 115, 52: 116, 53: 117, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 35: [1, 125] }, { 35: [1, 126] }, { 36: [1, 127] }, { 7: 111, 23: [1, 129], 35: $Vi, 38: $Vk, 40: 83, 45: 128, 47: 108, 48: 110, 49: $Vs, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 39: $Vg, 72: 130, 76: $Vh, 77: 77, 78: 53, 79: 54, 80: 55, 81: $Ve, 84: $Vf }, o($Vc, [2, 81]), o($Vc, [2, 86]), o($Vc, [2, 87]), { 39: $Vg, 72: 131, 76: $Vh, 77: 77, 78: 53, 79: 54, 80: 55, 81: $Ve, 84: $Vf }, o($Vc, [2, 83]), o($Vr, [2, 89]), { 23: [1, 132], 50: $Vw }, o($Vr, [2, 95]), o($Vx, [2, 96]), o($Vx, [2, 97]), o([23, 50], $Vy), o($Vz, [2, 118]), o($Vz, [2, 119]), o($Vz, [2, 120]), { 36: $V8, 38: $V9, 70: 28, 73: $Va, 74: 31, 75: $Vb }, { 7: 137, 35: $Vi, 36: $Vj, 38: $Vk, 40: 83, 48: 80, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 82: 134, 84: $Vn, 85: [1, 135], 86: 90, 87: 91, 88: 136, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, o($Vz, [2, 122]), { 39: [1, 139], 86: 140, 91: $Vp, 92: $Vq, 95: 138 }, o($VA, [2, 108]), o($VA, [2, 109]), o($VA, [2, 110]), o($VB, [2, 116]), o($VB, [2, 117]), o($VA, $VC), o($VD, $VE, { 90: [1, 141] }), { 89: $VF }, o($Vr, [2, 93]), o($Vr, [2, 101], { 22: $Vd }), o($Vr, [2, 102]), { 83: [1, 144], 85: [1, 143] }, { 85: [1, 145] }, o($Vr, [2, 106]), o($Vr, [2, 107]), o($V7, [2, 18]), { 23: [1, 146] }, o($V7, [2, 38]), { 23: [2, 47], 49: [1, 147], 50: $VG }, { 7: 111, 35: $Vi, 38: $Vk, 40: 83, 47: 149, 48: 110, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, o($VH, [2, 41]), o($VH, [2, 42]), { 23: [1, 150] }, { 51: [1, 151] }, { 23: [1, 152] }, { 23: [2, 52] }, { 23: [2, 53] }, { 23: [2, 54], 54: $VI, 55: $VJ, 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO, 61: $VP, 62: $VQ, 63: $VR, 64: $VS, 65: $VT, 66: $VU }, o($VV, [2, 68]), { 22: $Vt, 67: 166, 89: $VF }, { 7: 121, 22: $Vt, 35: $Vi, 53: 167, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, o($VV, [2, 71]), o($VV, [2, 72]), { 7: 121, 22: $Vt, 35: $Vi, 53: 168, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 23: [1, 169] }, { 36: [1, 170], 38: [1, 171] }, { 36: [1, 172] }, { 7: 175, 23: [1, 174], 35: $Vi, 44: 173 }, { 23: [1, 176] }, o($V7, [2, 40]), o($Vc, [2, 74]), o($Vc, [2, 78]), o($Vr, [2, 94]), { 7: 178, 35: $Vi, 38: $Vk, 40: 83, 48: 177, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 50: $Vw, 85: [1, 179] }, o($Vz, [2, 123]), o($VW, $VC, { 94: [1, 180] }), o($VW, $Vy, { 94: [1, 181] }), { 39: [1, 182], 50: [1, 183] }, o($Vz, [2, 129]), { 96: [1, 184] }, { 89: [1, 185] }, o($VD, $VX, { 90: [1, 186] }), o($Vr, [2, 103]), o($Vr, [2, 105]), o($Vr, [2, 104]), o($V7, [2, 37]), { 7: 188, 23: [2, 50], 35: $Vi, 38: $Vk, 40: 83, 48: 187, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 7: 190, 35: $Vi, 38: $Vk, 40: 83, 48: 189, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 23: [2, 48], 49: [1, 191], 50: $VG }, o($V7, [2, 22]), { 7: 121, 22: $Vt, 30: 192, 35: $Vi, 38: $Vk, 40: 115, 52: 116, 53: 117, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, o($V7, [2, 23]), { 7: 121, 22: $Vt, 35: $Vi, 53: 193, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 194, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 195, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 196, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 197, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 198, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 199, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 200, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 201, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 202, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 203, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 204, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, { 7: 121, 22: $Vt, 35: $Vi, 53: 205, 57: $Vu, 67: 118, 68: $Vv, 69: 122, 73: $Vm, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq }, o($VV, [2, 69]), o($VV, [2, 70]), { 23: [1, 206], 54: $VI, 55: $VJ, 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO, 61: $VP, 62: $VQ, 63: $VR, 64: $VS, 65: $VT, 66: $VU }, o($V7, [2, 24]), { 37: [1, 207] }, { 36: [1, 208] }, { 23: [1, 209] }, { 7: 211, 23: [1, 210], 35: $Vi }, o($V7, [2, 34]), o($VY, [2, 35]), o($V7, [2, 39]), o($Vx, [2, 99]), o($Vx, [2, 100]), o($Vz, [2, 121]), { 7: 213, 35: $Vi, 57: $VZ, 88: 212, 89: $V_ }, { 7: 217, 35: $Vi, 57: $VZ, 88: 216, 89: $V_ }, o($Vz, [2, 128]), { 86: 218, 91: $Vp, 92: $Vq }, o($V$, [2, 132], { 40: 83, 52: 84, 69: 85, 93: 88, 86: 90, 87: 91, 88: 95, 48: 219, 7: 220, 35: $Vi, 38: $Vk, 57: $Vl, 73: $Vm, 84: $Vn, 89: $Vo, 91: $Vp, 92: $Vq }), o($VA, [2, 112]), { 89: [1, 221] }, o($VH, [2, 43]), o($VH, [2, 46]), o($VH, [2, 44]), o($VH, [2, 45]), { 7: 188, 23: [2, 49], 35: $Vi, 38: $Vk, 40: 83, 48: 187, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, { 23: [2, 51] }, o($V01, [2, 55], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO, 61: $VP, 62: $VQ, 63: $VR, 64: $VS, 65: $VT, 66: $VU }), o($V01, [2, 56], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO, 61: $VP, 62: $VQ, 63: $VR, 64: $VS, 65: $VT, 66: $VU }), o($V11, [2, 57], { 58: $VM, 59: $VN, 60: $VO }), o($V11, [2, 58], { 58: $VM, 59: $VN, 60: $VO }), o($VV, [2, 59]), o($VV, [2, 60]), o($VV, [2, 61]), o($V21, [2, 62], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO }), o($V21, [2, 63], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO }), o($V21, [2, 64], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO }), o($V21, [2, 65], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO }), o($V21, [2, 66], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO }), o($V21, [2, 67], { 56: $VK, 57: $VL, 58: $VM, 59: $VN, 60: $VO }), o($VV, [2, 73]), { 7: 222, 35: $Vi, 40: 223, 84: $Vn, 93: 88 }, { 39: [1, 224] }, o($V7, [2, 32]), o($V7, [2, 33]), o($VY, [2, 36]), { 85: [1, 225] }, { 85: [1, 226] }, { 85: $VE }, { 89: [1, 227] }, { 85: [1, 228] }, { 85: [1, 229] }, { 96: [1, 230] }, o($V$, [2, 130]), o($V$, [2, 131]), o($VA, [2, 113]), { 23: [1, 231] }, { 23: [1, 232] }, { 37: [1, 233] }, o($Vz, [2, 124]), o($Vz, [2, 126]), { 85: $VX }, o($Vz, [2, 125]), o($Vz, [2, 127]), { 7: 234, 35: $Vi, 38: $Vk, 40: 83, 48: 235, 52: 84, 57: $Vl, 69: 85, 73: $Vm, 84: $Vn, 86: 90, 87: 91, 88: 95, 89: $Vo, 91: $Vp, 92: $Vq, 93: 88 }, o($V7, [2, 27]), o($V7, [2, 29]), { 7: 236, 35: $Vi, 40: 237, 84: $Vn, 93: 88 }, o($V$, [2, 133]), o($V$, [2, 134]), { 23: [1, 238] }, { 23: [1, 239] }, o($V7, [2, 28]), o($V7, [2, 30])],
        defaultActions: { 2: [2, 1], 26: [2, 2], 33: [2, 84], 34: [2, 85], 115: [2, 52], 116: [2, 53], 192: [2, 51], 214: [2, 114], 227: [2, 115] },
        parseError: function parseError(str, hash) {
          if (hash.recoverable) {
            this.trace(str);
          } else {
            var error = new Error(str);
            error.hash = hash;
            throw error;
          }
        },
        parse: function parse(input) {
          var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
          var args = lstack.slice.call(arguments, 1);
          var lexer2 = Object.create(this.lexer);
          var sharedState = { yy: {} };
          for (var k in this.yy) {
            if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
              sharedState.yy[k] = this.yy[k];
            }
          }
          lexer2.setInput(input, sharedState.yy);
          sharedState.yy.lexer = lexer2;
          sharedState.yy.parser = this;
          if (typeof lexer2.yylloc == "undefined") {
            lexer2.yylloc = {};
          }
          var yyloc = lexer2.yylloc;
          lstack.push(yyloc);
          var ranges = lexer2.options && lexer2.options.ranges;
          if (typeof sharedState.yy.parseError === "function") {
            this.parseError = sharedState.yy.parseError;
          } else {
            this.parseError = Object.getPrototypeOf(this).parseError;
          }
          function popStack(n) {
            stack.length = stack.length - 2 * n;
            vstack.length = vstack.length - n;
            lstack.length = lstack.length - n;
          }
          _token_stack:
            var lex = function() {
              var token;
              token = lexer2.lex() || EOF;
              if (typeof token !== "number") {
                token = self.symbols_[token] || token;
              }
              return token;
            };
          var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
          while (true) {
            state = stack[stack.length - 1];
            if (this.defaultActions[state]) {
              action = this.defaultActions[state];
            } else {
              if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
              }
              action = table[state] && table[state][symbol];
            }
            if (typeof action === "undefined" || !action.length || !action[0]) {
              var errStr = "";
              expected = [];
              for (p in table[state]) {
                if (this.terminals_[p] && p > TERROR) {
                  expected.push("'" + this.terminals_[p] + "'");
                }
              }
              if (lexer2.showPosition) {
                errStr = "Parse error on line " + (yylineno + 1) + ":\n" + lexer2.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
              } else {
                errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
              }
              this.parseError(errStr, {
                text: lexer2.match,
                token: this.terminals_[symbol] || symbol,
                line: lexer2.yylineno,
                loc: yyloc,
                expected
              });
            }
            if (action[0] instanceof Array && action.length > 1) {
              throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
            }
            switch (action[0]) {
              case 1:
                stack.push(symbol);
                vstack.push(lexer2.yytext);
                lstack.push(lexer2.yylloc);
                stack.push(action[1]);
                symbol = null;
                if (!preErrorSymbol) {
                  yyleng = lexer2.yyleng;
                  yytext = lexer2.yytext;
                  yylineno = lexer2.yylineno;
                  yyloc = lexer2.yylloc;
                  if (recovering > 0) {
                    recovering--;
                  }
                } else {
                  symbol = preErrorSymbol;
                  preErrorSymbol = null;
                }
                break;
              case 2:
                len = this.productions_[action[1]][1];
                yyval.$ = vstack[vstack.length - len];
                yyval._$ = {
                  first_line: lstack[lstack.length - (len || 1)].first_line,
                  last_line: lstack[lstack.length - 1].last_line,
                  first_column: lstack[lstack.length - (len || 1)].first_column,
                  last_column: lstack[lstack.length - 1].last_column
                };
                if (ranges) {
                  yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                  ];
                }
                r = this.performAction.apply(yyval, [
                  yytext,
                  yyleng,
                  yylineno,
                  sharedState.yy,
                  action[1],
                  vstack,
                  lstack
                ].concat(args));
                if (typeof r !== "undefined") {
                  return r;
                }
                if (len) {
                  stack = stack.slice(0, -1 * len * 2);
                  vstack = vstack.slice(0, -1 * len);
                  lstack = lstack.slice(0, -1 * len);
                }
                stack.push(this.productions_[action[1]][0]);
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                stack.push(newState);
                break;
              case 3:
                return true;
            }
          }
          return true;
        }
      };
      var lexer = /* @__PURE__ */ function() {
        var lexer2 = {
          EOF: 1,
          parseError: function parseError(str, hash) {
            if (this.yy.parser) {
              this.yy.parser.parseError(str, hash);
            } else {
              throw new Error(str);
            }
          },
          // resets the lexer, sets new input
          setInput: function(input, yy) {
            this.yy = yy || this.yy || {};
            this._input = input;
            this._more = this._backtrack = this.done = false;
            this.yylineno = this.yyleng = 0;
            this.yytext = this.matched = this.match = "";
            this.conditionStack = ["INITIAL"];
            this.yylloc = {
              first_line: 1,
              first_column: 0,
              last_line: 1,
              last_column: 0
            };
            if (this.options.ranges) {
              this.yylloc.range = [0, 0];
            }
            this.offset = 0;
            return this;
          },
          // consumes and returns one char from the input
          input: function() {
            var ch = this._input[0];
            this.yytext += ch;
            this.yyleng++;
            this.offset++;
            this.match += ch;
            this.matched += ch;
            var lines = ch.match(/(?:\r\n?|\n).*/g);
            if (lines) {
              this.yylineno++;
              this.yylloc.last_line++;
            } else {
              this.yylloc.last_column++;
            }
            if (this.options.ranges) {
              this.yylloc.range[1]++;
            }
            this._input = this._input.slice(1);
            return ch;
          },
          // unshifts one char (or a string) into the input
          unput: function(ch) {
            var len = ch.length;
            var lines = ch.split(/(?:\r\n?|\n)/g);
            this._input = ch + this._input;
            this.yytext = this.yytext.substr(0, this.yytext.length - len);
            this.offset -= len;
            var oldLines = this.match.split(/(?:\r\n?|\n)/g);
            this.match = this.match.substr(0, this.match.length - 1);
            this.matched = this.matched.substr(0, this.matched.length - 1);
            if (lines.length - 1) {
              this.yylineno -= lines.length - 1;
            }
            var r = this.yylloc.range;
            this.yylloc = {
              first_line: this.yylloc.first_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.first_column,
              last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
            };
            if (this.options.ranges) {
              this.yylloc.range = [r[0], r[0] + this.yyleng - len];
            }
            this.yyleng = this.yytext.length;
            return this;
          },
          // When called from action, caches matched text and appends it on next action
          more: function() {
            this._more = true;
            return this;
          },
          // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
          reject: function() {
            if (this.options.backtrack_lexer) {
              this._backtrack = true;
            } else {
              return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
              });
            }
            return this;
          },
          // retain first n characters of the match
          less: function(n) {
            this.unput(this.match.slice(n));
          },
          // displays already matched input, i.e. for error messages
          pastInput: function() {
            var past = this.matched.substr(0, this.matched.length - this.match.length);
            return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
          },
          // displays upcoming input, i.e. for error messages
          upcomingInput: function() {
            var next = this.match;
            if (next.length < 20) {
              next += this._input.substr(0, 20 - next.length);
            }
            return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
          },
          // displays the character position where the lexing error occurred, i.e. for error messages
          showPosition: function() {
            var pre = this.pastInput();
            var c = new Array(pre.length + 1).join("-");
            return pre + this.upcomingInput() + "\n" + c + "^";
          },
          // test the lexed token: return FALSE when not a match, otherwise return token
          test_match: function(match, indexed_rule) {
            var token, lines, backup;
            if (this.options.backtrack_lexer) {
              backup = {
                yylineno: this.yylineno,
                yylloc: {
                  first_line: this.yylloc.first_line,
                  last_line: this.last_line,
                  first_column: this.yylloc.first_column,
                  last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
              };
              if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
              }
            }
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) {
              this.yylineno += lines.length;
            }
            this.yylloc = {
              first_line: this.yylloc.last_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.last_column,
              last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
            };
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
              this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._backtrack = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
            if (this.done && this._input) {
              this.done = false;
            }
            if (token) {
              return token;
            } else if (this._backtrack) {
              for (var k in backup) {
                this[k] = backup[k];
              }
              return false;
            }
            return false;
          },
          // return next match in input
          next: function() {
            if (this.done) {
              return this.EOF;
            }
            if (!this._input) {
              this.done = true;
            }
            var token, match, tempMatch, index;
            if (!this._more) {
              this.yytext = "";
              this.match = "";
            }
            var rules = this._currentRules();
            for (var i = 0; i < rules.length; i++) {
              tempMatch = this._input.match(this.rules[rules[i]]);
              if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                  token = this.test_match(tempMatch, rules[i]);
                  if (token !== false) {
                    return token;
                  } else if (this._backtrack) {
                    match = false;
                    continue;
                  } else {
                    return false;
                  }
                } else if (!this.options.flex) {
                  break;
                }
              }
            }
            if (match) {
              token = this.test_match(match, rules[index]);
              if (token !== false) {
                return token;
              }
              return false;
            }
            if (this._input === "") {
              return this.EOF;
            } else {
              return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
              });
            }
          },
          // return next match that has a token
          lex: function lex() {
            var r = this.next();
            if (r) {
              return r;
            } else {
              return this.lex();
            }
          },
          // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
          begin: function begin(condition) {
            this.conditionStack.push(condition);
          },
          // pop the previously active lexer condition state off the condition stack
          popState: function popState() {
            var n = this.conditionStack.length - 1;
            if (n > 0) {
              return this.conditionStack.pop();
            } else {
              return this.conditionStack[0];
            }
          },
          // produce the lexer rule set which is active for the currently active lexer condition state
          _currentRules: function _currentRules() {
            if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
              return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            } else {
              return this.conditions["INITIAL"].rules;
            }
          },
          // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
          topState: function topState(n) {
            n = this.conditionStack.length - 1 - Math.abs(n || 0);
            if (n >= 0) {
              return this.conditionStack[n];
            } else {
              return "INITIAL";
            }
          },
          // alias for begin(condition)
          pushState: function pushState(condition) {
            this.begin(condition);
          },
          // return the number of states currently on the stack
          stateStackSize: function stateStackSize() {
            return this.conditionStack.length;
          },
          options: {},
          performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
              case 0:
                var _reg = /\\+$/;
                var _esc = yy_.yytext.match(_reg);
                var _num = _esc ? _esc[0].length : null;
                if (!_num || !(_num % 2)) {
                  this.begin("mu");
                } else {
                  yy_.yytext = yy_.yytext.replace(/\\$/, "");
                  this.begin("esc");
                }
                if (_num > 1) yy_.yytext = yy_.yytext.replace(/(\\\\)+$/, "\\");
                if (yy_.yytext) return 83;
                break;
              case 1:
                var _reg = /\\+$/;
                var _esc = yy_.yytext.match(_reg);
                var _num = _esc ? _esc[0].length : null;
                if (!_num || !(_num % 2)) {
                  this.begin("h");
                } else {
                  yy_.yytext = yy_.yytext.replace(/\\$/, "");
                  this.begin("esc");
                }
                if (_num > 1) yy_.yytext = yy_.yytext.replace(/(\\\\)+$/, "\\");
                if (yy_.yytext) return 83;
                break;
              case 2:
                return 83;
                break;
              case 3:
                this.popState();
                return 11;
                break;
              case 4:
                this.popState();
                yy_.yytext = yy_.yytext.replace(/^#\[\[|\]\]#$/g, "");
                return 10;
                break;
              case 5:
                this.popState();
                return 11;
                break;
              case 6:
                return 46;
                break;
              case 7:
                return 20;
                break;
              case 8:
                return 27;
                break;
              case 9:
                return 29;
                break;
              case 10:
                return 31;
                break;
              case 11:
                this.popState();
                return 32;
                break;
              case 12:
                this.popState();
                return 32;
                break;
              case 13:
                this.popState();
                return 33;
                break;
              case 14:
                this.popState();
                return 33;
                break;
              case 15:
                this.popState();
                return 41;
                break;
              case 16:
                return 34;
                break;
              case 17:
                return 21;
                break;
              case 18:
                return 42;
                break;
              case 19:
                return 43;
                break;
              case 20:
                return 37;
                break;
              case 21:
                return yy_.yytext;
                break;
              case 22:
                return yy_.yytext;
                break;
              case 23:
                return 65;
                break;
              case 24:
                return yy_.yytext;
                break;
              case 25:
                return 64;
                break;
              case 26:
                return yy_.yytext;
                break;
              case 27:
                return 61;
                break;
              case 28:
                return 62;
                break;
              case 29:
                return yy_.yytext;
                break;
              case 30:
                return 63;
                break;
              case 31:
                return yy_.yytext;
                break;
              case 32:
                return 54;
                break;
              case 33:
                return yy_.yytext;
                break;
              case 34:
                return 55;
                break;
              case 35:
                return yy_.yytext;
                break;
              case 36:
                return 66;
                break;
              case 37:
                return 68;
                break;
              case 38:
                return 35;
                break;
              case 39:
                return 35;
                break;
              case 40:
                return yy_.yytext;
                break;
              case 41:
                return 51;
                break;
              case 42:
                var len = this.stateStackSize();
                if (len >= 2 && this.topState() === "c" && this.topState(1) === "run") {
                  return 49;
                }
                break;
              case 43:
                break;
              case 44:
                return 38;
                break;
              case 45:
                return 39;
                break;
              case 46:
                return 96;
                break;
              case 47:
                yy.begin = true;
                return 75;
                break;
              case 48:
                this.popState();
                if (yy.begin === true) {
                  yy.begin = false;
                  return 76;
                } else {
                  return 83;
                }
                break;
              case 49:
                this.begin("c");
                return 22;
                break;
              case 50:
                if (this.popState() === "c") {
                  var len = this.stateStackSize();
                  if (this.topState() === "run") {
                    this.popState();
                    len = len - 1;
                  }
                  var tailStack = this.topState(len - 2);
                  if (len === 2 && tailStack === "h") {
                    this.popState();
                  } else if (len === 3 && tailStack === "mu" && this.topState(len - 3) === "h") {
                    this.popState();
                    this.popState();
                  }
                  return 23;
                } else {
                  return 83;
                }
                break;
              case 51:
                this.begin("i");
                return 84;
                break;
              case 52:
                if (this.popState() === "i") {
                  return 85;
                } else {
                  return 83;
                }
                break;
              case 53:
                return 94;
                break;
              case 54:
                return 81;
                break;
              case 55:
                return 90;
                break;
              case 56:
                return 50;
                break;
              case 57:
                yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2).replace(/\\"/g, '"');
                return 92;
                break;
              case 58:
                yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2).replace(/\\'/g, "'");
                return 91;
                break;
              case 59:
                return 73;
                break;
              case 60:
                return 73;
                break;
              case 61:
                return 73;
                break;
              case 62:
                return 89;
                break;
              case 63:
                return 36;
                break;
              case 64:
                this.begin("run");
                return 36;
                break;
              case 65:
                this.begin("h");
                return 20;
                break;
              case 66:
                this.popState();
                return 83;
                break;
              case 67:
                this.popState();
                return 83;
                break;
              case 68:
                this.popState();
                return 83;
                break;
              case 69:
                this.popState();
                return 4;
                break;
              case 70:
                return 4;
                break;
            }
          },
          rules: [/^(?:[^#]*?(?=\$))/, /^(?:[^\$]*?(?=#))/, /^(?:[^\x00]+)/, /^(?:#\*[\s\S]+?\*#)/, /^(?:#\[\[[\s\S]+?\]\]#)/, /^(?:##[^\n]*)/, /^(?:#@)/, /^(?:#(?=[a-zA-Z{]))/, /^(?:set[ ]*(?=[^a-zA-Z0-9_]+))/, /^(?:if[ ]*(?=[^a-zA-Z0-9_]+))/, /^(?:elseif[ ]*(?=[^a-zA-Z0-9_]+))/, /^(?:else\b)/, /^(?:\{else\})/, /^(?:end\b)/, /^(?:\{end\})/, /^(?:break\b)/, /^(?:foreach[ ]*(?=[^a-zA-Z0-9_]+))/, /^(?:noescape(?=[^a-zA-Z0-9_]+))/, /^(?:define[ ]*(?=[^a-zA-Z0-9_]+))/, /^(?:macro[ ]*(?=[^a-zA-Z0-9_]+))/, /^(?:in\b)/, /^(?:[%\+\-\*/])/, /^(?:<=)/, /^(?:le\b)/, /^(?:>=)/, /^(?:ge\b)/, /^(?:[><])/, /^(?:gt\b)/, /^(?:lt\b)/, /^(?:==)/, /^(?:eq\b)/, /^(?:\|\|)/, /^(?:or\b)/, /^(?:&&)/, /^(?:and\b)/, /^(?:!=)/, /^(?:ne\b)/, /^(?:not\b)/, /^(?:\$!(?=[{a-zA-Z_]))/, /^(?:\$(?=[{a-zA-Z_]))/, /^(?:!)/, /^(?:=)/, /^(?:[ ]+(?=[^,]))/, /^(?:\s+)/, /^(?:\{)/, /^(?:\})/, /^(?::[\s]*)/, /^(?:\{[\s]*)/, /^(?:[\s]*\})/, /^(?:\([\s]*(?=[$'"\[\{\-0-9\w()!]))/, /^(?:\))/, /^(?:\[[\s]*(?=[\-$"'0-9{\[\]]+))/, /^(?:\])/, /^(?:\.\.)/, /^(?:\.(?=[a-zA-Z_]))/, /^(?:\.(?=[\d]))/, /^(?:,[ ]*)/, /^(?:"(\\"|[^\"])*")/, /^(?:'(\\'|[^\'])*')/, /^(?:null\b)/, /^(?:false\b)/, /^(?:true\b)/, /^(?:[0-9]+)/, /^(?:[_a-zA-Z][a-zA-Z0-9_\-]*)/, /^(?:[_a-zA-Z][a-zA-Z0-9_\-]*[ ]*(?=\())/, /^(?:#)/, /^(?:.)/, /^(?:\s+)/, /^(?:[\$#])/, /^(?:$)/, /^(?:$)/],
          conditions: { "mu": { "rules": [5, 38, 39, 47, 48, 49, 50, 51, 52, 54, 63, 65, 66, 67, 69], "inclusive": false }, "c": { "rules": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 49, 50, 51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63], "inclusive": false }, "i": { "rules": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 44, 45, 45, 46, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63], "inclusive": false }, "h": { "rules": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 38, 39, 40, 41, 46, 49, 50, 51, 52, 54, 62, 64, 66, 67, 69], "inclusive": false }, "esc": { "rules": [68], "inclusive": false }, "run": { "rules": [38, 39, 40, 42, 43, 44, 45, 46, 49, 50, 51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 66, 67, 69], "inclusive": false }, "INITIAL": { "rules": [0, 1, 2, 70], "inclusive": true } }
        };
        return lexer2;
      }();
      parser.lexer = lexer;
      function Parser() {
        this.yy = {};
      }
      Parser.prototype = parser;
      parser.Parser = Parser;
      return new Parser();
    }();
    if (typeof __require !== "undefined" && typeof exports !== "undefined") {
      exports.parser = velocity;
      exports.Parser = velocity.Parser;
      exports.parse = function() {
        return velocity.parse.apply(velocity, arguments);
      };
      exports.main = function commonjsMain(args) {
        if (!args[1]) {
          console.log("Usage: " + args[0] + " FILE");
          process.exit(1);
        }
        var source = __require("fs").readFileSync(__require("path").normalize(args[1]), "utf8");
        return exports.parser.parse(source);
      };
      if (typeof module !== "undefined" && __require.main === module) {
        exports.main(process.argv.slice(1));
      }
    }
  }
});

// src/parse.js
var require_parse2 = __commonJS({
  "src/parse.js"(exports, module) {
    "use strict";
    var Parser = require_parse();
    var _parse = Parser.parse;
    var utils = require_utils();
    var blockTypes = {
      if: true,
      foreach: true,
      macro: true,
      noescape: true,
      define: true,
      macro_body: true
    };
    var customBlocks = [];
    var parse = function(str, blocks, ignoreSpace) {
      var asts = _parse(str);
      customBlocks = blocks || {};
      ignoreSpace || utils.forEach(asts, function trim(ast, i) {
        var TRIM_REG = /^[ \t]*\n/;
        if (ast.type && ["references", "raw"].indexOf(ast.type) === -1) {
          var _ast = asts[i + 1];
          if (typeof _ast === "string" && TRIM_REG.test(_ast)) {
            asts[i + 1] = _ast.replace(TRIM_REG, "");
          }
        }
      });
      var ret2 = makeLevel(asts);
      return utils.isArray(ret2) ? ret2 : ret2.arr;
    };
    function makeLevel(block, index) {
      var len = block.length;
      index = index || 0;
      var ret2 = [];
      var ignore = index - 1;
      for (var i = index; i < len; i++) {
        if (i <= ignore) continue;
        var ast = block[i];
        var type = ast.type;
        var isBlockType = blockTypes[type];
        if (!isBlockType && ast.type === "macro_call" && customBlocks[ast.id]) {
          isBlockType = true;
          ast.type = ast.id;
          delete ast.id;
        }
        if (!isBlockType && type !== "end") {
          ret2.push(ast);
        } else if (type === "end") {
          return { arr: ret2, step: i };
        } else {
          var _ret = makeLevel(block, i + 1);
          ignore = _ret.step;
          _ret.arr.unshift(block[i]);
          ret2.push(_ret.arr);
        }
      }
      return ret2;
    }
    module.exports = parse;
  }
});

// src/velocity.js
var require_velocity = __commonJS({
  "src/velocity.js"(exports, module) {
    var Compile = require_compile2();
    var Helper = require_helper();
    var parse = require_parse2();
    Compile.parse = parse;
    var Velocity = {
      parse,
      Compile,
      Helper
    };
    Velocity.render = function(template, context, macros, config) {
      var asts = parse(template);
      var compile = new Compile(asts, config);
      return compile.render(context, macros);
    };
    module.exports = Velocity;
    if (typeof window !== "undefined") {
      window.Velocity = Velocity;
    }
  }
});
export default require_velocity();
