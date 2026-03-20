'use strict';

const { loadProject } = require('../project/loader');
const { startPreview } = require('../preview/server');

async function preview(args, flags) {
  const dir = args[0] || process.cwd();
  const project = loadProject(dir, flags.config);
  const port = flags.port ? parseInt(flags.port) : 3333;

  await startPreview(project, { port });
}

module.exports = preview;
