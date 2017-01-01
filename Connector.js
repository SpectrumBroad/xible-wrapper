module.exports = function(XIBLE) {

	class Connector {

		constructor(obj) {

			if (obj) {
				Object.assign(this, obj);
			}

		}

		setType(type) {
			this.type = type;
		}

		setEnd(type, end) {

			//remove from old origin
			let endConnectorIndex = this[type].connectors.indexOf(this);
			if (this[type] && endConnectorIndex > -1) {

				this[type].connectors.splice(endConnectorIndex, 1);
				this[type].node.removeEventListener('position', this.originDrawFn);

				//trigger detachment
				this[type].emit('editorDetach', this);

			}

			this[type] = end;
			if (!end) {
				return null;
			}

			this.setType(end.type);

			//disallow multiple connectors with same origin and destination
			//if (!window.dummyFluxConnectors || window.dummyFluxConnectors.indexOf(this) === -1) {

			let otherType = (type === 'origin' ? 'destination' : 'origin');
			end.connectors
				.filter((conn) => conn[otherType] === this[otherType])
				.forEach((conn) => conn.delete());

			//}

			end.connectors.push(this);

			//trigger attachment functions
			end.emit('editorAttach', this);

		}

		setOrigin(origin) {
			this.setEnd('origin', origin);
		}

		setDestination(destination) {
			this.setEnd('destination', destination);
		}

		delete() {

			this.setOrigin(null);
			this.setDestination(null);

		}

	}

	return Connector;

};
