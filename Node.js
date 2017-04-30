module.exports = function(XIBLE) {

	const EventEmitter = require('events').EventEmitter;

	class Node extends EventEmitter {

		constructor(obj = {}, ignoreData = false) {

			super();

			Object.assign(this, obj);
			this.removeAllListeners();

			if (!this._id) {
				this._id = XIBLE.generateObjectId();
			}

			//copy data
			this.data = null;
			if (obj.data && !ignoreData) {
				this.data = Object.assign({}, obj.data);
			} else {
				this.data = {};
			}

			//add inputs
			this.initInputs(obj.inputs);

			//add outputs
			this.initOutputs(obj.outputs);

			this.setPosition(obj.left, obj.top);

		}

		initInputs(inputs) {

			this.inputs = {};
			if (inputs) {
				for (let name in inputs) {
					this.addInput(new XIBLE.NodeInput(name, inputs[name]));
				}
			}

		}

		initOutputs(outputs) {

			this.outputs = {};
			if (outputs) {
				for (let name in outputs) {
					this.addOutput(new XIBLE.NodeOutput(name, outputs[name]));
				}
			}

		}

		static getAll() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/nodes`);
			return req.toJson().then((nodes) => {

				Object.keys(nodes).forEach((nodeName) => {
					nodes[nodeName] = new Node(nodes[nodeName]);
				});

				return nodes;

			});

		}

		static getAllInputObjectNodes(node) {

			let resultNodes = [node];
			let resultConnectors = [];

			let objectInputs = node.getInputs().filter((input) => input.type !== 'trigger');

			let inputObjectNodes = [];
			objectInputs.forEach((objectInput) => {

				resultConnectors.push(...objectInput.connectors);
				objectInput.connectors.forEach((connector) => {

					let objs = Node.getAllInputObjectNodes(connector.origin.node);
					resultNodes.push(...objs.nodes);
					resultConnectors.push(...objs.connectors);

				});

			});

			return {
				'nodes': resultNodes,
				'connectors': resultConnectors
			};

		}

		setData(attr, value) {

			if (typeof value === 'undefined') {
				Object.assign(this.data, attr);
			} else {
				this.data[attr] = value;
			}

			this.emit('setdata', attr, value);
			return this;

		}

		getData(attr) {
			return this.data[attr];
		}

		getEditorContent() {

			let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/nodes/${encodeURIComponent(this.name)}/editor/index.htm`);
			return req.toString();

		}

		setPosition(left = 0, top = 0) {

			this.left = left;
			this.top = top;

			this.emit('position', this);

		}

		addInput(input) {

			this.addIo(input);
			this.inputs[input.name] = input;

			return input;

		}

		addOutput(output) {

			this.addIo(output);
			this.outputs[output.name] = output;

			return output;

		}

		addIo(child) {

			child.node = this;

			if (!child._id) {
				child._id = XIBLE.generateObjectId();
			}

			child.node = this;
			return child;

		}

		deleteInput(input) {

			delete this.inputs[input.name];
			input.node = null;

			return input;

		}

		deleteOutput(output) {

			delete this.outputs[output.name];
			output.node = null;

			return output;

		}

		delete() {

			for (let name in this.inputs) {
				this.inputs[name].delete();
			}

			for (let name in this.outputs) {
				this.outputs[name].delete();
			}

			if (this.flow) {

				let nodeIndex = this.flow.nodes.indexOf(this);
				if (nodeIndex > -1) {
					this.flow.nodes.splice(nodeIndex, 1);
				}

			}

		}

		getInputByName(name) {
			return this.inputs[name];
		}

		getOutputByName(name) {
			return this.outputs[name];
		}

		getInputs() {

			return Object.keys(this.inputs)
				.map((key) => this.inputs[key]);

		}

		getOutputs() {

			return Object.keys(this.outputs)
				.map((key) => this.outputs[key]);

		}

		getGlobalOutputs() {
			return this.getOutputs().filter((output) => output.global);
		}

		getInputsByType(type = null) {

			let inputs = [];
			for (let name in this.inputs) {
				if (this.inputs[name].type === type) {
					inputs.push(this.inputs[name]);
				}
			}
			return inputs;

		}

		getOutputsByType(type = null) {

			let outputs = [];
			for (let name in this.outputs) {
				if (this.outputs[name].type === type) {
					outputs.push(this.outputs[name]);
				}
			}
			return outputs;

		}

		removeAllStatuses() {
		}

	}

	return Node;

};
