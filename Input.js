module.exports = function(XIBLE) {

  const Io = require('./Io.js');

	class Input extends Io {

		constructor() {
			super(...arguments);
		}

    delete() {

      super.delete();

      if (this.node) {
        this.node.deleteInput(this);
      }

    }

  }

  return Input;

};
