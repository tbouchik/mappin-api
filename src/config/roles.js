const roles = ['user', 'admin'];

const roleRights = new Map();
roleRights.set(roles[0], ['manageDocuments']);
roleRights.set(roles[1], ['getUsers', 'manageUsers', 'manageDocuments', 'manageFilters']);

module.exports = {
  roles,
  roleRights,
};
