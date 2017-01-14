module.exports = function(XIBLE) {

	const OoHttpRequest = require('../oohttprequest');
	const EventEmitter = require('events').EventEmitter;

	const Connector = require('./Connector')(XIBLE);
	const Node = require('./Node')(XIBLE);

	class Flow extends EventEmitter {

		constructor(obj) {

			super();

			this._id = null;
			this.runnable = true;
			this.running = false;

			if (obj) {
				Object.assign(this, obj);
			}

			this.removeAllListeners();

			//setup viewstate
			this.viewState = {
				left: obj && obj.viewState && obj.viewState.left ? obj.viewState.left : 0,
				top: obj && obj.viewState && obj.viewState.top ? obj.viewState.top : 0,
				zoom: obj && obj.viewState && obj.viewState.zoom ? obj.viewState.zoom : 1,
				backgroundLeft: obj && obj.viewState && obj.viewState.backgroundLeft ? obj.viewState.backgroundLeft : 0,
				backgroundTop: obj && obj.viewState && obj.viewState.backgroundTop ? obj.viewState.backgroundTop : 0
			};

			//setup nodes
			if (obj && obj.nodes) {
				this.initNodes(obj.nodes);
			} else {
				this.nodes = [];
			}

			//setup connectors
			if (obj && obj.connectors) {
				this.initConnectors(obj.connectors);
			} else {
				this.connectors = [];
			}

		}

		initNodes(nodes) {

			this.nodes = [];
			nodes.forEach((node) => this.addNode(new Node(node)));

		}

		initConnectors(connectors) {

			this.connectors = [];
			connectors.forEach((conn) => {

				conn.origin = this.getOutputById(conn.origin);
				conn.destination = this.getInputById(conn.destination);

				this.addConnector(new Connector(conn));

			});

		}

		static getById(id) {

			let req = new OoHttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${id}`);
			return req.toObject(Flow);

		}

		static getAll() {

			let req = new OoHttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows`);
			return req.toObject(Object).then((flows) => {

				Object.keys(flows).forEach((flowId) => {
					flows[flowId] = new Flow(flows[flowId]);
				});

				return flows;

			});

		}

		stop() {

			this.undirect();

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = new OoHttpRequest('PATCH', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}/stop`);
			this.emit('stop');

			return req.send();

		}

		start() {

			this.undirect();

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = new OoHttpRequest('PATCH', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}/start`);
			this.emit('start');

			return req.send();

		}

		delete() {

			this.undirect();

			if (!this._id) {
				return;
			}

			let req = new OoHttpRequest('DELETE', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}`);
			this.emit('delete');

			return req.send();

		}

		save(asNew) {

			this.undirect();

			return new Promise((resolve, reject) => {

				let json = this.toJson();
				let req;

				if (!this._id || asNew) {
					req = new OoHttpRequest('POST', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows`);
				} else {
					req = new OoHttpRequest('PUT', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}`);
				}

				req.toObject(Object, json).then((json) => {

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

				let req = new OoHttpRequest('PATCH', `https://${XIBLE.hostname}:${XIBLE.port}/api/flows/${this._id}/direct`);
				req.toString(nodes).then((json) => {

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
			const NODE_WHITE_LIST = ['_id', 'name', 'type', 'left', 'top', 'inputs', 'outputs', 'hidden', 'global'];
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

						if (this !== inputsObject && this !== outputsObject && this !== dataObject && key && isNaN(key) && NODE_WHITE_LIST.indexOf(key) === -1) {
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

			return `{"_id":"${this._id.replace(/"/g,'\\"')}","nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;

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

		addConnector(connector) {

			if (connector.flow) {
				throw new Error(`connector already hooked up to other flow`);
			}

			this.connectors.push(connector);
			connector.flow = this;
			return connector;

		}

		deleteConnector(connector) {

			let index = this.connectors.indexOf(connector);
			if (index > -1) {
				this.connectors.splice(index, 1);
			}
			connector.flow = null;

		}

		addNode(node) {

			if (node.flow) {
				throw new Error(`node already hooked up to other flow`);
			}

			this.nodes.push(node);
			node.flow = this;

			return node;

		}

		deleteNode(node) {

			let index = this.nodes.indexOf(node);
			if (index > -1) {
				this.nodes.splice(index, 1);
			}
			node.flow = null;

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

		removeAllStatuses() {
			this.nodes.forEach((node) => {
				node.removeAllStatuses();
			});
		}

	}

	return Flow;

};
