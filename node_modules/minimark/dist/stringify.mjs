//#region src/utils/index.ts
function indent(text, { ignoreFirstLine = false } = {}) {
	return text.split("\n").map((line, index) => {
		if (ignoreFirstLine && index === 0) return line;
		return "  " + line;
	}).join("\n");
}
function textContent(node) {
	if (typeof node === "string") return node;
	const children = node.slice(2);
	return children.map((child) => textContent(child)).join("");
}
function htmlAttributes(attributes) {
	return Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(" ");
}

//#endregion
//#region src/handlers/code.ts
function code(node, _) {
	return `\`${textContent(node)}\``;
}

//#endregion
//#region src/handlers/pre.ts
function pre(node, state) {
	const [_, attributes, ...children] = node;
	const language = attributes.language || "";
	const filename = attributes.filename ? " [" + attributes.filename + "]" : "";
	const result = "```" + language + filename + (attributes.meta || "") + "\n" + String(node[1]?.code || children.join("")).trim() + "\n```";
	return result + state.context.blockSeparator;
}

//#endregion
//#region src/handlers/hr.ts
function hr(_, state) {
	return "---" + state.context.blockSeparator;
}

//#endregion
//#region src/handlers/heading.ts
function heading(node, state) {
	const [tag] = node;
	const level = Number(tag.slice(1));
	const content = state.flow(node, state);
	return "#".repeat(level) + " " + content + state.context.blockSeparator;
}

//#endregion
//#region src/handlers/p.ts
function p(node, state) {
	const children = node.slice(2);
	return children.map((child) => state.one(child, state)).join("") + state.context.blockSeparator;
}

//#endregion
//#region src/handlers/a.ts
function a(node, state) {
	const [_, attributes] = node;
	const content = state.flow(node, state);
	return `[${content}](${attributes.href})`;
}

//#endregion
//#region src/handlers/ul.ts
function ul(node, state) {
	const children = node.slice(2);
	const revert = state.applyContext({
		list: true,
		order: false
	});
	let result = children.map((child) => state.one(child, state)).join("").trim();
	if (revert.list) result = "\n" + indent(result);
	else result = result + state.context.blockSeparator;
	state.applyContext(revert);
	return result;
}

//#endregion
//#region src/handlers/ol.ts
function ol(node, state) {
	const children = node.slice(2);
	const revert = state.applyContext({
		list: true,
		order: 1
	});
	let result = children.map((child) => state.one(child, state)).join("").trim();
	if (revert.list) result = "\n" + indent(result);
	else result = result + state.context.blockSeparator;
	state.applyContext(revert);
	return result;
}

//#endregion
//#region src/handlers/li.ts
function li(node, state) {
	const children = node.slice(2);
	const order = state.context.order;
	let prefix = order ? `${order}. ` : "- ";
	const className = node[1].className && Array.isArray(node[1].className) ? node[1].className.join(" ") : String(node[1].className);
	const taskList = className.includes("task-list-item");
	if (taskList) {
		const input = children.shift();
		prefix += input[1].checked ? "[x] " : "[ ] ";
	}
	const result = children.map((child) => state.one(child, state)).join("").trim();
	if (order) state.applyContext({ order: order + 1 });
	return `${prefix}${result}\n`;
}

//#endregion
//#region src/handlers/html.ts
const textBlocks = new Set([
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li"
]);
const selfCloseTags = new Set([
	"br",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"source",
	"track",
	"wbr"
]);
const fullHtmlTags = new Set(["table"]);
function html(node, state, parent) {
	const [tag, attributes, ...children] = cleanup(node);
	const inline = textBlocks.has(String(parent?.[0])) && children.every((child) => typeof child === "string");
	const isSelfClose = selfCloseTags.has(String(tag));
	const revert = !state.context.html && fullHtmlTags.has(String(tag)) ? state.applyContext({ html: true }) : null;
	const content = children.map((child) => state.one(child, state, node)).join("").trim();
	if (revert) state.applyContext(revert);
	const attrs = Object.keys(attributes).length > 0 ? ` ${htmlAttributes(attributes)}` : "";
	if (isSelfClose) return `<${tag}${attrs} />` + (inline ? "" : state.context.blockSeparator);
	return inline ? `<${tag}${attrs}>${content}</${tag}>` : `<${tag}${attrs}>\n${paddNoneHtmlContent(content, state)}\n</${tag}>` + state.context.blockSeparator;
}
function paddNoneHtmlContent(content, state) {
	if (state.context.html) return indent(content);
	return (content.trim().startsWith("<") ? "" : "\n") + content + (content.trim().endsWith(">") ? "" : "\n");
}
function cleanup(node) {
	const [tag, attributes] = node;
	if (tag === "pre") return [
		tag,
		{ language: attributes.language },
		attributes.code || textContent(node)
	];
	return node;
}

//#endregion
//#region src/handlers/strong.ts
function strong(node, _) {
	return `**${textContent(node)}**`;
}

//#endregion
//#region src/handlers/emphesis.ts
function emphesis(node, _) {
	return `*${textContent(node)}*`;
}

//#endregion
//#region src/handlers/blockquote.ts
function blockquote(node, state) {
	const children = node.slice(2);
	const content = children.map((child) => state.one(child, state)).join("").trim().split("\n").map((line) => `> ${line}`).join("\n");
	return content + state.context.blockSeparator;
}

//#endregion
//#region src/handlers/img.ts
function img(node, _) {
	const [_tag, attrs] = node;
	return `![${attrs.alt}](${attrs.src})`;
}

//#endregion
//#region src/handlers/del.ts
function del(node, _) {
	return `~~${textContent(node)}~~`;
}

//#endregion
//#region src/handlers/mdc.ts
function mdc(node, state) {
	const [tag, attributes, ...children] = node;
	if (tag === "table") return html(node, state);
	const inline = children.every((child) => typeof child === "string");
	const content = children.map((child) => state.one(child, state)).join("").trim();
	const attrs = Object.keys(attributes).length > 0 ? `{${htmlAttributes(attributes)}}` : "";
	if (tag === "span") return `[${content}]${attrs}`;
	return inline ? `:${tag}${content && `[${content}]`}${attrs}` : `::${tag}${attrs}\n${content}\n::` + state.context.blockSeparator;
}

//#endregion
//#region src/handlers/index.ts
const handlers = {
	code,
	pre,
	hr,
	h1: heading,
	h2: heading,
	h3: heading,
	h4: heading,
	h5: heading,
	h6: heading,
	p,
	a,
	ul,
	ol,
	li,
	html,
	strong,
	em: emphesis,
	blockquote,
	img,
	del,
	mdc
};

//#endregion
//#region src/utils/state.ts
function one(node, state, parent) {
	if (typeof node === "string") return node;
	if (state.context.html) return state.handlers.html(node, state, parent);
	const nodeHandler = state.context.handlers[node[0]] || state.handlers[node[0]];
	if (nodeHandler) return nodeHandler(node, state, parent);
	return state.context.format === "markdown/mdc" ? state.handlers.mdc(node, state, parent) : state.handlers.html(node, state, parent);
}
function flow(node, state, parent) {
	const children = node.slice(2);
	let result = "";
	for (const child of children) result += one(child, state, parent || node);
	return result;
}
function createState(ctx = {}) {
	const context = {
		blockSeparator: "\n\n",
		format: "markdown/mdc",
		handlers: {},
		...ctx,
		html: ctx.format === "text/html"
	};
	return {
		handlers,
		context,
		flow,
		one,
		applyContext: (edit) => {
			const revert = {};
			for (const [key, value] of Object.entries(edit)) {
				revert[key] = context[key];
				context[key] = value;
			}
			return revert;
		}
	};
}

//#endregion
//#region src/stringify.ts
const defaultOptions = {
	format: "markdown/mdc",
	removeLastStyle: true
};
function stringify(node, options = {}) {
	options = {
		...defaultOptions,
		...options
	};
	const _state = createState(options);
	const children = node.value;
	const lastIndex = children.length - 1;
	return children.map((child, index) => {
		if (index === lastIndex && options.removeLastStyle && child[0] === "style") return "";
		return one(child, _state);
	}).join("").trim() + "\n";
}

//#endregion
export { stringify };