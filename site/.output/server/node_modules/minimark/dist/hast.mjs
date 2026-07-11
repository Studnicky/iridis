//#region src/hast.ts
function fromHast(tree) {
	return {
		type: "minimark",
		value: tree.children.map(hastToMinimarkNode).filter((v) => v !== void 0)
	};
}
function hastToMinimarkNode(input) {
	if (input.type === "comment") return void 0;
	if (input.type === "text") return input.value;
	if (input.tag === "code" && input.props?.className && input.props.className.length === 0) delete input.props.className;
	return [
		input.tag,
		input.props || {},
		...(input.children || []).map(hastToMinimarkNode).filter((v) => v !== void 0)
	];
}
function toHast(tree) {
	return {
		type: "root",
		children: tree.value.map(minimarkToHastNode)
	};
}
function minimarkToHastNode(input) {
	if (typeof input === "string") return {
		type: "text",
		value: input
	};
	const [tag, props, ...children] = input;
	return {
		type: "element",
		tag,
		props,
		children: children.map(minimarkToHastNode)
	};
}

//#endregion
export { fromHast, toHast };