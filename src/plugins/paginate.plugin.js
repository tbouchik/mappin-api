const paginate = (schema) => {
  schema.static({
    async paginate(filter, options = {}) {
      let sort = '';
      if (options.sortBy) {
        const sortingCriteria = [];
        options.sortBy.split(',').forEach((sortOption) => {
          const [key, order] = sortOption.split(':');
          sortingCriteria.push((order === 'desc' ? '-' : '') + key);
        });
        sort = sortingCriteria.join(' ');
      } else {
        sort = 'createdAt';
      }

      const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
      const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
      const skip = (page - 1) * limit;

      const countPromise = this.countDocuments(filter).exec();
      let query = this.find(filter).sort(sort).skip(skip).limit(limit);

      if (options.populate) {
        options.populate.forEach((populateOption) => {
          query = query.populate(populateOption);
        });
      }
      const docsPromise = query.exec();

      return Promise.all([countPromise, docsPromise]).then((values) => {
        const [totalResults, results] = values;
        const totalPages = Math.ceil(totalResults / limit);
        const result = {
          results,
          page,
          limit,
          totalPages,
          totalResults,
        };
        return Promise.resolve(result);
      });
    },
  });
};

module.exports = paginate;
