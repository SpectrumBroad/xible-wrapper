module.exports = function(XIBLE) {

	class Config {

		static getAll() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config`);
			return req.toJson();

		}

		static validatePermissions() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config/validatePermissions`);
			return req.toJson();

		}

		static deleteValue(path) {

			let req = XIBLE.httpBase.request('DELETE', `http${XIBLE.baseUrl}/api/config/value`);
			return req.toJson({
				path: path
			});

		}

		static setValue(path, value) {

			if (['string', 'number', 'boolean', 'date'].indexOf(typeof value) === -1) {
				throw new Error(`Param "value" should be of type "string", "number", "boolean" or "date"`);
			}

			let req = XIBLE.httpBase.request('PUT', `http${XIBLE.baseUrl}/api/config/value`);
			return req.toJson({
				path: path,
				value: value
			});

		}

		static getObjectValueOnPath(obj, path) {

			let pathSplit = path.split('.');
			let sel = obj;

			for (let i = 0; i < pathSplit.length; ++i) {

				let part = pathSplit[i];
				if (sel.hasOwnProperty(part)) {
					sel = sel[part];
				} else {
					return null;
				}

			}

			return sel;

		}

		static getValue(path) {

			return this.getAll()
				.then((config) => this.getObjectValueOnPath(config, path));

		}

	}

	return Config;

};
