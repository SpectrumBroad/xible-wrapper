module.exports = function(XIBLE) {

  const Io = require('./Io.js');

	class Input extends Io {

		constructor() {
			super(...arguments);
		}

  }

  return Input;

};
