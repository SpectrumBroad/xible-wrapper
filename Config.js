'use strict';

module.exports = (XIBLE) => {
  class Config {

    static getAll() {
      const req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config`);
      return req.toJson();
    }

    static validatePermissions() {
      const req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/config/validatePermissions`);
      return req.toJson();
    }

    static deleteValue(path) {
      const req = XIBLE.httpBase.request('DELETE', `http${XIBLE.baseUrl}/api/config/value`);
      return req.toJson({
        path
      });
    }

    static setValue(path, value) {
      if (['string', 'number', 'boolean', 'date'].indexOf(typeof value) === -1) {
        throw new Error('Param "value" should be of type "string", "number", "boolean" or "date"');
      }

      const req = XIBLE.httpBase.request('PUT', `http${XIBLE.baseUrl}/api/config/value`);
      return req.toJson({
        path,
        value
      });
    }

    static getObjectValueOnPath(obj, path) {
      const pathSplit = path.split('.');
      let sel = obj;

      for (let i = 0; i < pathSplit.length; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) {
          sel = sel[part];
        } else {
          return null;
        }
      }

      return sel;
    }

    static getValue(path) {
      return this.getAll()
        .then(config => this.getObjectValueOnPath(config, path));
    }

  }

  return Config;
};
