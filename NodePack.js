'use strict';

module.exports = (XIBLE) => {
  const { EventEmitter } = require('events');

  class NodePack extends EventEmitter {
    constructor(obj) {
      super();
      Object.assign(this, obj);
    }

    static async getByName(nodePackName) {
      return XIBLE.http.request('GET', `/api/nodepacks/${encodeURIComponent(nodePackName)}`)
      .toObject(NodePack);
    }

    static async getAll() {
      const req = XIBLE.http.request('GET', '/api/nodepacks');
      return req.toObjectMap(NodePack);
    }

    async delete() {
      if (!this._id) {
        return false;
      }

      const req = XIBLE.http.request('DELETE', `/api/nodepacks/${encodeURIComponent(this.name)}`);
      await req.send();

      return true;
    }
  }

  return NodePack;
};
