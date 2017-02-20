module.exports = function(XIBLE) {

	class Config {

    static validatePermissions() {

      let req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config/validatePermissions`);
      return req.toJson();

    }

  }

  return Config;

};
