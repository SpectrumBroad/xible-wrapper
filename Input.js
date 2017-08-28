'use strict';

module.exports = (XIBLE) => {
  class Input extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteInput(this);
      }
    }
  }

  return Input;
};
