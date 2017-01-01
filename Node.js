module.exports = function(XIBLE) {

	const HttpRequest = require('../HttpRequest');
	const EventEmitter = require('events').EventEmitter;

	class Node extends EventEmitter {

		constructor(obj) {

			super();

			if (obj) {
				Object.assign(this, obj);
			}

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

			let req = new HttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/nodes/${this.name}/editor/index.htm`);
			return req.send();

		}

		setPosition(left, top) {

			this.left = left || 0;
			this.top = top || 0;

			this.emit('position', this);

		}

		duplicate() {

			var duplicateNode = new Node(this);

			//create a unique id for the node
			duplicateNode._id = FluxEditor.generateObjectId();

			//create a unique id for the inputs
			for (let name in duplicateNode.inputs) {
				duplicateNode.inputs[name]._id = FluxEditor.generateObjectId();
			}

			//create a unique id for the outputs
			for (let name in duplicateNode.outputs) {
				duplicateNode.outputs[name]._id = FluxEditor.generateObjectId();
			}

			return duplicateNode;

		}

		appendIo(child) {

			if (child instanceof NodeIo) {

				child.node = this;

				if (!child._id) {
					child._id = FluxEditor.generateObjectId();
				}

				if (child instanceof NodeInput) {
					this.inputs[child.name] = child;
				} else {
					this.outputs[child.name] = child;
				}

				child.node = this;
				return child;

			}

		}

		removeIo(child) {

			if (child instanceof NodeIo) {

				if (child instanceof NodeInput) {
					delete this.inputs[child.name];
				} else {
					delete this.outputs[child.name];
				}

				child.node = null;
				return child;

			}

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

	}

	return Node;

};
