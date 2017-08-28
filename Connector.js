'use strict';

module.exports = () => {
  class Connector {
    constructor(obj) {
      if (obj) {
        Object.assign(this, obj);

        this.origin = null;
        this.destination = null;
        this.setOrigin(obj.origin, true);
        this.setDestination(obj.destination, true);

        // trigger attachment functions
        // after both points have been set.
        if (this.origin) {
          this.origin.emit('attach', this);
        }
        if (this.destination) {
          this.destination.emit('attach', this);
        }

        if (obj.type) {
          this.setType(obj.type);
        }
      }
    }

    setType(type) {
      this.type = type;
    }

    filterDuplicateConnectors(type, end) {
      const otherType = (type === 'origin' ? 'destination' : 'origin');
      end.connectors
      .filter(conn => conn[otherType] === this[otherType])
      .forEach(conn => conn.delete());
    }

    setEnd(type, end, noEmit) {
      // remove from old origin
      let endConnectorIndex;
      if (this[type] && (endConnectorIndex = this[type].connectors.indexOf(this)) > -1) {
        this[type].connectors.splice(endConnectorIndex, 1);
        this[type].emit('detach', this);
      }

      this[type] = end;
      if (!end) {
        return null;
      }

      this.setType(end.type);

      // disallow multiple connectors with same origin and destination
      this.filterDuplicateConnectors(type, end);

      end.connectors.push(this);

      // trigger attachment functions
      if (!noEmit) {
        end.emit('attach', this);
      }

      return end;
    }

    setOrigin(origin, noEmit) {
      this.setEnd('origin', origin, noEmit);
    }

    setDestination(destination, noEmit) {
      this.setEnd('destination', destination, noEmit);
    }

    delete() {
      this.setOrigin(null);
      this.setDestination(null);
    }
  }

  return Connector;
};
