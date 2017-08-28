'use strict';

module.exports = (XIBLE) => {
  const TYPE_DEFS = {};

  class TypeDef {
    static getAll() {
      const req = XIBLE.http.request('GET', '/api/typedefs');
      return req.toObject(Object)
      .then((typeDefs) => {
        Object.keys(typeDefs)
        .forEach((typeDefName) => {
          TYPE_DEFS[typeDefName] = new TypeDef(typeDefs[typeDefName]);
        });

        return TYPE_DEFS;
      });
    }
  }

  return TypeDef;
};
