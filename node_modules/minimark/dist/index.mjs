//#region src/utils/index.ts
function textContent(node) {
	if (typeof node === "string") return node;
	const children = node.slice(2);
	return children.map((child) => textContent(child)).join("");
}

//#endregion
//#region src/utils/visit.ts
function visit(tree, checker, visitor) {
	function walk(node, parent, index) {
		if (checker(node)) {
			const res = visitor(node);
			if (res !== void 0) parent[index] = res;
		}
		if (Array.isArray(node) && node.length > 2) for (let i = 2; i < node.length; i++) walk(node[i], node, i);
	}
	tree.value.forEach((node, i) => {
		walk(node, tree.value, i);
	});
}

//#endregion
export { textContent, visit };