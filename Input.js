'use strict';

module.exports = (XIBLE) => {
  class Input extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteInput(this);
      }
    }

    matchesConnectors(connectors) {
      if (!connectors) {
        return false;
      }

      const connector = connectors[0];
      return this.matchesTypeDef(connector)
      .then(matchesTypeDef =>
        this.node !== connector.origin.node &&
        (
          (!this.type && connector.origin.type !== 'trigger') ||
          (!connector.origin.type && this.type !== 'trigger') ||
          connector.origin.type === this.type || matchesTypeDef
        )
      );
    }
  }

  return Input;
};
