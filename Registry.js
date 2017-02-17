module.exports = function(XIBLE) {

	class Registry {

    static getAllNodes() {

      let req = XIBLE.httpRequestBase.request('GET', `http${XIBLE.baseUrl}/api/registry/nodes`);
			return req.toObject(Object).then((nodes) => {

				Object.keys(nodes).forEach((nodeName) => {
					nodes[nodeName] = new XIBLE.Node(nodes[nodeName]);
				});

				return nodes;

			});

    }

    static searchNodes(searchString) {

      let req = XIBLE.httpRequestBase.request('GET', `http${XIBLE.baseUrl}/api/registry/nodes?search=${encodeURIComponent(searchString)}`);
			return req.toObject(Object).then((nodes) => {

				Object.keys(nodes).forEach((nodeName) => {
					nodes[nodeName] = new XIBLE.Node(nodes[nodeName]);
				});

				return nodes;

			});

    }

  }

  return Registry;

};
