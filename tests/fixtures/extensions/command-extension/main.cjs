'use strict';

module.exports.activate = function activate(api) {
  api.commands.registerCommand('fixture.ping', () => api.workspace.getConfiguration()['fixture.greeting']);
};
