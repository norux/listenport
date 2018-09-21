#!/usr/bin/env node

const listenPort = require('../lib/listenport')
const program = require('commander')

function errorAndExit (msg) {
  console.log()
  console.log(`  error: ${msg}`)
  console.log()
  process.exit(1)
}

function isPortValid (port) {
  return (port >= 1 && port <= 65535)
}

function parsePort (val) {
  const num = parseInt(val)
  if (Number.isNaN(num)) errorAndExit(`invalid number '${val}'`)
  if (!isPortValid(num)) errorAndExit(`invalid port number '${num}'`)
  return num
}

function parseRange (val) {
  if (val.indexOf(':') === -1) errorAndExit(`invalid range '${val}' (valid range is '8080:8090)'`)
  return val.split(':').map(v => {
    const num = parseInt(v)
    if (Number.isNaN(num)) errorAndExit(`invalid number '${v}'`)
    if (!isPortValid(num)) errorAndExit(`invalid port number '${num}'`)
    return num
  })
}

program
  .version(require('../package').version, '-v, --version')
  .usage('[options]')
  .option('-a, --all', 'find all process listening')
  .option('-p, --port <port>', 'find process listening <port>', parsePort)
  .option('-r, --range <start>:<enn>', 'find all process listening <start>:<end>', parseRange)

program.on('--help', () => {
  console.log()
  console.log('  Examples:')
  console.log()
  console.log('    $ listenport -a')
  console.log('    $ listenport -p 8080')
  console.log('    $ listenport -r 8080:8090')
  console.log()
})

program.parse(process.argv)
if (process.argv.length <= 2) program.help()
if (program.args.length > 0) program.help()

if (program.all) {
  listenPort.all()
} else if (program.range) {
  if (program.range.length === 1) program.range[1] = program.range[0]
  if (program.range.length > 2) errorAndExit('range are more than 2 (range must be <start>:<end>)')
  if (program.range[0] > program.range[1]) errorAndExit('start number of range is bigger than end number')
  listenPort.range(program.range)
} else if (program.port) {
  listenPort.port(program.port)
}
