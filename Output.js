'use strict';

module.exports = (XIBLE) => {
  class Output extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteOutput(this);
      }
    }

    matchesConnectors(connectors) {
      if (!connectors) {
        return false;
      }

      const connector = connectors[0];
      return this.matchesTypeDef(connector)
      .then(matchesTypeDef =>
        this.node !== connector.destination.node &&
        (
          (!this.type && connector.destination.type !== 'trigger') ||
          (!connector.destination.type && this.type !== 'trigger') ||
          matchesTypeDef
        )
      );
    }
  }

  return Output;
};
