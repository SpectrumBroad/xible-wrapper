module.exports = function(XIBLE) {

	const HttpRequest = require('../HttpRequest');
	const EventEmitter = require('events').EventEmitter;

	const Connector = require('./Connector')(XIBLE);
	const Node = require('./Node')(XIBLE);

	class Flow extends EventEmitter {

		constructor(obj) {

			super();

			if (obj) {
				Object.assign(this, obj);
			}

			this.nodes = this.nodes.map((node) => new Node(node));
			this.connectors = this.connectors.map((conn) => {

				conn.origin = this.getOutputById(conn.origin);
				conn.destination = this.getInputById(conn.destination);

				return new Connector(conn);

			});

		}

		static getById(id) {

			let req = new HttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${id}`);
			return req.toObject(Flow);

		}

		stop() {

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = new HttpRequest('PATCH', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}/stop`);
			this.emit('stop');

			return req.send();

		}

		start() {

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = new HttpRequest('PATCH', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}/start`);
			this.emit('start');

			return req.send();

		}

		delete() {

			if (!this._id) {
				return;
			}

			let req = new HttpRequest('DELETE', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}`);
			req.send();

			this.emit('delete');

		}

		save() {

			this.undirect();

			return new Promise((resolve, reject) => {

				let json = this.toJson();
				let req;

				if (!this._id) {
					req = new HttpRequest('POST', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows`);
				} else {
					req = new HttpRequest('PUT', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}`);
				}

				req.toJson(json, (json) => {

					this._id = json._id;
					resolve(this);
					this.emit('save');

				});

			});

		}

		undirect() {
			this.emit('undirect');
		}

		direct(related) {

			//throttle
			if (this._lastPostDirectFunction || this._lastDirectPromise) {

				let hasFunction = !!this._lastPostDirectFunction;

				this._lastPostDirectFunction = () => {

					this.direct(related);
					this._lastPostDirectFunction = null;

				};

				if (!hasFunction) {
					this._lastDirectPromise.then(this._lastPostDirectFunction);
				}

				return;

			}

			//ensure this flow is saved first
			if (!this._id) {
				return this.save().then(() => this.direct(related));
			}

			if (!related) {
				return Promise.reject(`related argument missing`);
			}

			this._lastDirectPromise = new Promise((resolve, reject) => {

				let nodes = related.nodes.map((node) => {
					return {
						_id: node._id,
						data: node.data
					};
				});

				let req = new HttpRequest('PATCH', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}/direct`);

				req.toJson(JSON.stringify(nodes), (json) => {

					resolve(this);
					this._lastDirectPromise = null;

					this.emit('direct');

				});

			});

			return this._lastDirectPromise;

		}

		//TODO: this functions isn't 'pretty'
		//more importantly, it can't handle nodes with io's named 'data'
		toJson(nodes, connectors) {

			//the nodes
			const nodeWhitelist = ['_id', 'name', 'type', 'left', 'top', 'inputs', 'outputs', 'hidden', 'global'];
			var dataObject, inputsObject, outputsObject;
			var nodeJson = JSON.stringify(nodes || this.nodes, function(key, value) {

				switch (key) {

					case 'inputs':

						inputsObject = value;
						return value;

					case 'outputs':

						outputsObject = value;
						return value;

					case 'data':

						dataObject = value;
						return value;

					default:

						if (this !== inputsObject && this !== outputsObject && this !== dataObject && key && isNaN(key) && nodeWhitelist.indexOf(key) === -1) {
							return;
						} else {
							return value;
						}

				}

			});

			//the connectors
			const CONNECTOR_WHITE_LIST = ['_id', 'origin', 'destination', 'type', 'hidden'];
			var connectorJson = JSON.stringify(connectors || this.connectors, function(key, value) {

				if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
					return;
				} else if (value && (key === 'origin' || key === 'destination')) {
					return value._id;
				} else {
					return value;
				}

			});

			return `{"nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;

		}

		/**
		 *	Sets the viewstate of a flow
		 *	@param {Object}	viewState
		 *	@param {Number}	viewState.left
		 *	@param {Number}	viewState.top
		 *	@param {Number}	viewState.backgroundLeft
		 *	@param {Number}	viewState.backgroundTop
		 *	@param {Number}	viewState.zoom
		 */
		setViewState(viewState) {
			this.viewState = viewState;
		}

		getNodeById(id) {
			return this.nodes.find((node) => node._id === id);
		}

		deleteNode(node) {
			node.delete();
		}

		getInputById(id) {

			for (let i = 0; i < this.nodes.length; ++i) {

				let node = this.nodes[i];
				for (let name in node.inputs) {

					if (node.inputs[name]._id === id) {
						return node.inputs[name];
					}

				}

			}

		}

		getOutputById(id) {

			for (let i = 0; i < this.nodes.length; ++i) {

				let node = this.nodes[i];
				for (let name in node.outputs) {

					if (node.outputs[name]._id === id) {
						return node.outputs[name];
					}

				}

			}

		}

	}

	return Flow;

};
