#!/usr/bin/env node
'use strict';

const { run } = require('../src/cli/commands');
run(process.argv.slice(2));
