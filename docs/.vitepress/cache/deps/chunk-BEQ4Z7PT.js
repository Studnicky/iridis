import {
  script
} from "./chunk-4ZXDKO2G.js";
import {
  BaseStyle
} from "./chunk-QMKA7W5L.js";
import {
  Transition,
  createBaseVNode,
  createBlock,
  createCommentVNode,
  mergeProps,
  normalizeClass,
  openBlock,
  renderSlot,
  resolveDynamicComponent,
  vShow,
  withCtx,
  withDirectives
} from "./chunk-O6EOGSKJ.js";

// node_modules/primevue/accordioncontent/style/index.mjs
var classes = {
  root: "p-accordioncontent",
  contentWrapper: "p-accordioncontent-wrapper",
  content: "p-accordioncontent-content"
};
var AccordionContentStyle = BaseStyle.extend({
  name: "accordioncontent",
  classes
});

// node_modules/primevue/accordioncontent/index.mjs
var script$1 = {
  name: "BaseAccordionContent",
  "extends": script,
  props: {
    as: {
      type: [String, Object],
      "default": "DIV"
    },
    asChild: {
      type: Boolean,
      "default": false
    }
  },
  style: AccordionContentStyle,
  provide: function provide() {
    return {
      $pcAccordionContent: this,
      $parentInstance: this
    };
  }
};
var script2 = {
  name: "AccordionContent",
  "extends": script$1,
  inheritAttrs: false,
  inject: ["$pcAccordion", "$pcAccordionPanel"],
  computed: {
    id: function id() {
      return "".concat(this.$pcAccordion.$id, "_accordioncontent_").concat(this.$pcAccordionPanel.value);
    },
    ariaLabelledby: function ariaLabelledby() {
      return "".concat(this.$pcAccordion.$id, "_accordionheader_").concat(this.$pcAccordionPanel.value);
    },
    attrs: function attrs() {
      return mergeProps(this.a11yAttrs, this.ptmi("root", this.ptParams));
    },
    a11yAttrs: function a11yAttrs() {
      return {
        id: this.id,
        role: "region",
        "aria-labelledby": this.ariaLabelledby,
        "data-pc-name": "accordioncontent",
        "data-p-active": this.$pcAccordionPanel.active
      };
    },
    ptParams: function ptParams() {
      return {
        context: {
          active: this.$pcAccordionPanel.active
        }
      };
    }
  }
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return !_ctx.asChild ? (openBlock(), createBlock(Transition, mergeProps({
    key: 0,
    name: "p-collapsible"
  }, _ctx.ptm("transition", $options.ptParams)), {
    "default": withCtx(function() {
      return [($options.$pcAccordion.lazy ? $options.$pcAccordionPanel.active : true) ? withDirectives((openBlock(), createBlock(resolveDynamicComponent(_ctx.as), mergeProps({
        key: 0,
        "class": _ctx.cx("root")
      }, $options.attrs), {
        "default": withCtx(function() {
          return [createBaseVNode("div", mergeProps({
            "class": _ctx.cx("contentWrapper")
          }, _ctx.ptm("contentWrapper", $options.ptParams)), [createBaseVNode("div", mergeProps({
            "class": _ctx.cx("content")
          }, _ctx.ptm("content", $options.ptParams)), [renderSlot(_ctx.$slots, "default")], 16)], 16)];
        }),
        _: 3
      }, 16, ["class"])), [[vShow, $options.$pcAccordion.lazy ? true : $options.$pcAccordionPanel.active]]) : createCommentVNode("", true)];
    }),
    _: 3
  }, 16)) : renderSlot(_ctx.$slots, "default", {
    key: 1,
    "class": normalizeClass(_ctx.cx("root")),
    active: $options.$pcAccordionPanel.active,
    a11yAttrs: $options.a11yAttrs
  });
}
script2.render = render;

export {
  script2 as script
};
//# sourceMappingURL=chunk-BEQ4Z7PT.js.map
