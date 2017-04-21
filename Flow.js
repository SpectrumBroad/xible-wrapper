module.exports = function(XIBLE) {

	const EventEmitter = require('events').EventEmitter;

	const Connector = require('./Connector')(XIBLE);
	const Node = require('./Node')(XIBLE);

	XIBLE.setMaxListeners(0);

	class Flow extends EventEmitter {

		constructor(obj) {

			super();

			this._id = null;
			this.runnable = true;
			this.state = Flow.STATE_STOPPED;

			XIBLE.on('message', (json) => {

				if (json.flowId !== this._id) {
					return;
				}

				switch (json.method) {

					case 'xible.flow.removeAllStatuses':
						this.removeAllStatuses();
						this.emit('removeAllStatuses');
						break;

					case 'xible.flow.initializing':
						this.state = Flow.STATE_INITIALIZING;
						this.emit('initializing', json);
						break;

					case 'xible.flow.initialized':
						this.state = Flow.STATE_INITIALIZED;
						this.emit('initialized', json);
						break;

					case 'xible.flow.starting':
						this.state = Flow.STATE_STARTING;
						if (json.directed) {
							this.directed = true;
						} else {
							this.directed = false;
						}
						this.emit('starting', json);
						break;

					case 'xible.flow.started':
						this.state = Flow.STATE_STARTED;
						if (json.directed) {
							this.directed = true;
						} else {
							this.directed = false;
						}
						this.emit('started', json);
						break;

					case 'xible.flow.stopping':
						this.state = Flow.STATE_STOPPING;
						this.emit('stopping', json);
						break;

					case 'xible.flow.stopped':
						this.state = Flow.STATE_STOPPED;
						this.emit('stopped', json);
						break;

				}

			});

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

		static validatePermissions() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/validateFlowPermissions`);
			return req.toJson();

		}

		static getById(id) {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(id)}`);
			return req.toObject(Flow);

		}

		static getAll() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/flows`);
			return req.toObject(Object).then((flows) => {

				Object.keys(flows).forEach((flowId) => {
					flows[flowId] = new Flow(flows[flowId]);
				});

				return flows;

			});

		}

		static get STATE_STOPPED() {
			return 0;
		}

		static get STATE_STOPPING() {
			return 1;
		}

		static get STATE_INITIALIZING() {
			return 2;
		}

		static get STATE_INITIALIZED() {
			return 3;
		}

		static get STATE_STARTING() {
			return 4;
		}

		static get STATE_STARTED() {
			return 5;
		}

		stop() {

			this.undirect();

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}/stop`);
			this.emit('stop');

			return req.send();

		}

		start() {

			this.undirect();

			if (!this._id) {
				return Promise.reject(`no id`);
			}

			let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}/start`);
			this.emit('start');

			return req.send();

		}

		delete() {

			this.undirect();

			if (!this._id) {
				return;
			}

			let req = XIBLE.httpBase.request('DELETE', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}`);
			this.emit('delete');

			return req.send();

		}

		save(asNew) {

			this.undirect();

			return new Promise((resolve, reject) => {

				let json = this.toJson();
				let req;

				if (!this._id || asNew) {
					req = XIBLE.httpBase.request('POST', `http${XIBLE.baseUrl}/api/flows`);
				} else {
					req = XIBLE.httpBase.request('PUT', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}`);
				}

				req.toObject(Object, json).then((json) => {

					this._id = json._id;
					resolve(this);
					this.emit('save');

				}).catch((err) => {
					reject(err);
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

				let req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/flows/${encodeURIComponent(this._id)}/direct`);
				req.toString(nodes).then((json) => {

					resolve(this);
					this._lastDirectPromise = null;

					this.emit('direct');

				}).catch((err) => {
					reject(err);
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

						if (this !== inputsObject && this !== outputsObject) {

							dataObject = value;
							return value;

						} // jshint ignore: line

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
			const connectorJson = JSON.stringify(connectors || this.connectors, function(key, value) {

				if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
					return;
				} else if (value && (key === 'origin' || key === 'destination')) {
					return value._id;
				} else {
					return value;
				}

			});

			return `{"_id":${JSON.stringify(this._id)},"nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;

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

		/**
		 *	returns an array of all nodes in this flow that contain at least one global output
		 *	@returns	{Node[]}	list of nodes
		 */
		getGlobalNodes() {

			return this.nodes.filter((node) => {
				return node.getOutputs().some((output) => output.global);
			});

		}

		/**
		 *	returns an array of all outputs in this flow that are global
		 *	@returns	{Output[]}	list of nodes
		 */
		getGlobalOutputs() {

			let globalOutputs = [];
			for (let i = 0; i < this.nodes.length; ++i) {
				globalOutputs = globalOutputs.concat(this.nodes[i].getGlobalOutputs());
			}
			return globalOutputs;

		}

		removeAllStatuses() {
			this.nodes.forEach((node) => {
				node.removeAllStatuses();
			});
		}

	}

	return Flow;

};
