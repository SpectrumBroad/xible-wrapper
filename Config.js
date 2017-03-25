module.exports = function(XIBLE) {

	class Config {

		static validatePermissions() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config/validatePermissions`);
			return req.toJson();

		}

		static deleteValue(path) {

			let req = XIBLE.httpBase.request('DELETE', `http${XIBLE.baseUrl}/api/config/value`);
			return req.send({
				path: path
			});

		}

		static setValue(path, value) {

			if (['string', 'number', 'boolean', 'date'].indexOf(typeof value) === -1) {
				throw new Error(`Param "value" should be of type "string", "number", "boolean" or "date"`);
			}

			let req = XIBLE.httpBase.request('PUT', `http${XIBLE.baseUrl}/api/config/value`);
			return req.send({
				path: path,
				value: value
			});

		}

	}

	return Config;

};
