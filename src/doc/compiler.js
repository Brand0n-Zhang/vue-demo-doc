const fs = require("fs");
const path = require("path");
const compiler = require("vue-template-compiler");

const parse = require("@babel/parser");

const traverse = require("@babel/traverse");

const types = require("@babel/types");

const { RenderMd } = require("./render");

// 获取.vue 字符串
let vueStr = fs.readFileSync(
  path.resolve(__dirname, "../components/HelloWorld.vue"),
  "utf8"
);

let componentInfo = {
  name: null,
  props: null,
  data: null,
  slots: null,
  methods: null,
};

// {
//   name: 'MyComponent',
//   desc: '这里是组件的描述',
//   props: {
//     name: {
//       name: 'name',
//       desc: 'name属性,支持 `.sync`',
//       type: 'String、Number',
//       required: true,
//       sync: true
//     },
//     value: {
//       name: 'value',
//       desc: 'v-model',
//       type: 'String、Number',
//       model: true
//     }
//   },
//   model: undefined,
//   slots: {
//     header: { name: 'header', desc: 'header slot' },
//     '-': { name: '-', desc: 'default slot' },
//     footer: { name: 'footer', desc: 'footer slot' }
//   },
//   events: { onclear: { name: 'onclear', desc: '描述onclear事件' } },
//   methods: {
//     clear: {
//       name: 'clear',
//       async: true,
//       res: '返回值描述',
//       desc: '这是一个`async`方法',
//       params: [Array]
//     }
//   }
// }

let vue = compiler.parseComponent(vueStr);

//生成html部分的 ast
let template = compiler.compile(vue.template.content, {
  preserveWhitespace: false,
  comments: true,
});

//生成js部分的 ast
let jsAst = parse.parse(vue.script.content, {
  allowImportExportEverywhere: true,
});

// 分析name
const extractName = (node) => {
  return node.value.value;
};

// 分析props
const extractProps = (node) => {
  let props = {};

  // 分析Props类型
  function getPropType(node) {
    switch (node.type) {
      case "Identifier":
        return node.name;
      case "ArrayExpression":
        return node.elements.map((item) => item.name).join("、");
      default:
        return "Any";
    }
  }

  // 遍历props下所有node（两级）
  node.value.properties.forEach((item) => {
    let propsItem = {};
    // 遍历出注释
    const { leadingComments } = item;

    // 遍历子props下所有属性
    item.value.properties.forEach((nItem) => {
      if (nItem.key.name === "type") {
        propsItem.name = item.key.name;
        propsItem.type = getPropType(nItem.value);
      }
    });
    // 为子props添加名称和类型
    props[item.key.name] = propsItem;
    // 为子props添加注释
    props[item.key.name].desc = leadingComments[0].value.trim();
  });

  return props;
};

// 分析methods
const extractMethods = (node) => {
  let methods = {};

  node.value.properties.forEach((item) => {
    let methodsItem = {};
    methodsItem.name = item.key.name;
    const { leadingComments } = item;
    methodsItem.desc = leadingComments[0].value.trim();
    methods[item.key.name] = methodsItem;
  });
  return methods;
};

// 分析data
const extractData = (node) => {
  let data = {};

  node.body.body[0].argument.properties.forEach((item) => {
    let dataItem = {};
    dataItem.name = item.key.name;
    dataItem.desc = item.leadingComments[0].value.trim();
    data[item.key.name] = dataItem;
  });
  return data;
};

traverse.default(jsAst, {
  ExportDefaultDeclaration(path) {
    path.node.declaration.properties.forEach((item) => {
      switch (item.key.name) {
        case "props":
          componentInfo.props = extractProps(item); // 提取 props
          break;
        case "methods":
          componentInfo.methods = extractMethods(item); // 提取 methods
          break;
        case "name":
          componentInfo.name = extractName(item); // 提取插件名称
          break;
        case "data":
          componentInfo.data = extractData(item); // 提取 model
          break;
        default:
          break;
      }
    });
  },
});

const traverserTemplateAst = (ast, visitor = {}) => {
  function traverseArray(array, parent) {
    array.forEach((child) => {
      traverseNode(child, parent);
    });
  }

  function traverseNode(node, parent) {
    // visitor.enter && visitor.enter(node, parent);
    visitor[node.tag] && visitor[node.tag](node, parent);
    node.children && traverseArray(node.children, node);
    // visitor.exit && visitor.exit(node, parent);
  }

  traverseNode(ast, null);
};

traverserTemplateAst(template.ast, {
  slot(node, parent) {
    !componentInfo.slots && (componentInfo.slots = {});
    // 获取节点位置
    let index = parent.children.findIndex((item) => item === node);
    let desc = "无描述";
    let name = "-";
    if (index > 0) {
      let tag = parent.children[index - 1];
      // isComment 判断是否是 注释
      if (tag.isComment) {
        desc = tag.text.trim();
      }
    }
    if (node.slotName) name = node.attrsMap.name;
    componentInfo.slots[name] = {
      name,
      desc,
    };
  },
});

// console.log(template.ast);

console.log(componentInfo);

let result = new RenderMd(componentInfo, {
  // md 生成的表格 会根据此配置 生成标题和列顺序
  props: { name: "参数", desc: "说明", type: "类型" },
  slots: { name: "插槽名称", desc: "说明" },
  data: { name: "事件名称", desc: "说明" },
  methods: { name: "方法名", desc: "说明" },
}).render();
console.log(result);
