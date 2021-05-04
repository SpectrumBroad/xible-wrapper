'use strict';

module.exports = (XIBLE) => {
  let TYPE_DEFS = null;

  class TypeDef {
    constructor(obj) {
      if (obj) {
        Object.assign(this, obj);
      }
    }

    /**
    * Verifies whether the given typeDef matches this typeDef.
    * If not matched directly, the extends property (-tree) of the given typeDef
    * is verified against this typeDef.
    * @returns {Boolean}
    */
    matches(typeDef) {
      if (typeDef === this) {
        return true;
      }

      if (!typeDef || !typeDef.extends) {
        return false;
      }

      // check for extends
      if (typeof typeDef.extends === 'string') {
        const extendsTypeDef = TYPE_DEFS[typeDef.extends];
        if (!extendsTypeDef || extendsTypeDef === typeDef) {
          return false;
        }

        return this.matches(extendsTypeDef);
      }

      if (Array.isArray(typeDef.extends)) {
        for (let i = 0; i < typeDef.extends.length; i += 1) {
          const extendsTypeDef = TYPE_DEFS[typeDef.extends[i]];
          if (!extendsTypeDef) {
            continue;
          }

          if (this.matches(extendsTypeDef)) {
            return true;
          }
        }
      }

      return false;
    }

    /**
     * Returns the cached result for getAll().
     * If there is no result yet, simply returns getAll().
     * @private
     */
    static getAllCached() {
      if (TYPE_DEFS) {
        return Promise.resolve(TYPE_DEFS);
      }

      return this.getAll();
    }

    /**
    * Retrieves all typeDefs from the XIBLE API.
    * @returns {Promise.<TypeDef[]>}
    */
    static getAll() {
      const req = XIBLE.http.request('GET', '/api/typedefs');
      return req.toObject(TypeDef)
        .then((typeDefs) => {
          TYPE_DEFS = {};
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
