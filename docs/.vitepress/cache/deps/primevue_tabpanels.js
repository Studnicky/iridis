import {
  script
} from "./chunk-4ZXDKO2G.js";
import {
  BaseStyle
} from "./chunk-QMKA7W5L.js";
import "./chunk-4NXIHAZF.js";
import {
  createElementBlock,
  mergeProps,
  openBlock,
  renderSlot
} from "./chunk-O6EOGSKJ.js";
import "./chunk-BUSYA2B4.js";

// node_modules/primevue/tabpanels/style/index.mjs
var classes = {
  root: "p-tabpanels"
};
var TabPanelsStyle = BaseStyle.extend({
  name: "tabpanels",
  classes
});

// node_modules/primevue/tabpanels/index.mjs
var script$1 = {
  name: "BaseTabPanels",
  "extends": script,
  props: {},
  style: TabPanelsStyle,
  provide: function provide() {
    return {
      $pcTabPanels: this,
      $parentInstance: this
    };
  }
};
var script2 = {
  name: "TabPanels",
  "extends": script$1,
  inheritAttrs: false
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", mergeProps({
    "class": _ctx.cx("root"),
    role: "presentation"
  }, _ctx.ptmi("root")), [renderSlot(_ctx.$slots, "default")], 16);
}
script2.render = render;
export {
  script2 as default
};
//# sourceMappingURL=primevue_tabpanels.js.map
