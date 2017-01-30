module.exports = function(XIBLE) {

	const OoHttpRequest = require('../oohttprequest');

	class Registry {

    static getAllNodes() {

      let req = new OoHttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/registry/nodes`);
			return req.toObject(Object).then((nodes) => {

				Object.keys(nodes).forEach((nodeName) => {
					nodes[nodeName] = new XIBLE.Node(nodes[nodeName]);
				});

				return nodes;

			});

    }

    static searchNodes(searchString) {

      let req = new OoHttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/registry/nodes?search=${encodeURIComponent(searchString)}`);
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
