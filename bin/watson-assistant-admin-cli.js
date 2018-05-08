#!/usr/bin/env node
const yargsCmd = require('yargs')

const handleConfig = (argv) => {
  if (argv.verbose) {
    require('debug').enable('watson-assistant-admin-cli*')
  }
  return true
}

const wrapHandler = (builder) => {
  const origHandler = builder.handler
  builder.handler = (argv) => {
    if (handleConfig(argv)) {
      origHandler(argv)
    }
  }
  return builder
}

yargsCmd.usage('Watson Assistant Admin CLI\n\nUsage: $0 [options]') // eslint-disable-line
  .help('help').alias('help', 'h')
  .version('version', require('../package.json').version).alias('version', 'V')
  .showHelpOnFail(true)
  .strict(true)
  .demandCommand(1, 'You need at least one command before moving on')
  .command(wrapHandler(require('../src/backup')))
  .option('verbose', {
    alias: 'v',
    describe: 'Enable verbose output',
    default: false
  })
  .argv
