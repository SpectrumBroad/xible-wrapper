module.exports = function(XIBLE) {

	class Registry {

    static searchNodePacks(searchString) {

      let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/registry/nodepacks?search=${encodeURIComponent(searchString)}`);
			return req.toJson();

    }

		static installNodePackByName(nodePackName) {

			let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/registry/nodepacks/${encodeURIComponent(nodePackName)}/install`);
			return req.send();

		}

  }

  return Registry;

};
