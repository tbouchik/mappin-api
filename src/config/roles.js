const roles = ['user', 'operator', 'admin'];

const roleRights = new Map();
roleRights.set('user', ['manageDocuments']);
roleRights.set('operator', ['getUsers', 'manageUsers', 'manageDocuments', 'manageFilters']);
roleRights.set('admin', ['getUsers', 'manageUsers', 'manageDocuments', 'manageFilters', 'publishDocuments']);

module.exports = {
  roles,
  roleRights,
};
