;(function () {
  module.exports = {
    all: allListeningPort,
    port: singleListeningPort,
    range: rangeListeningPort
  }

  const { spawn } = require('child_process')
  const chalk = require('chalk')

  const ipv = 4
  const protocol = 'TCP'
  const state = 'LISTEN'

  function portInListen (port) {
    return new Promise((resolve, reject) => {
      // lsof -i4tcp:1-1000 -s tcp:LISTEN -P | awk 'FNR > 1 {print $2","$9}'
      const child = spawn(`lsof -i${ipv}${protocol}:${port} -s${protocol}:${state} -P | awk 'FNR > 1 {print $2","$9}'`, {
        shell: true
      })

      let data = ''
      child.stdout.on('data', _data => {
        data += _data
      })

      child.on('close', (errCode) => {
        if (errCode !== 0) return reject(new Error('something error: portInListen'))

        let output = data.toString().trim().split('\n')

        // When no result
        if (output[0].length === 0) return resolve(null)

        resolve(output.map(_data => {
          return {
            pid: parseInt(_data.substr(0, _data.indexOf(','))),
            port: parseInt(_data.substr(_data.lastIndexOf(':') + 1, _data.length))
          }
        }))
      })
    })
  }

  function processInfo (pidInfo) {
    return new Promise((resolve, reject) => {
      // ps -p 351,54353 -o pid,ppid,user,pcpu,pmem,args
      const pid = pidInfo.map(obj => obj.pid)
      const child = spawn(`
        ps -p ${pid.join(',')} -o pid,ppid,user,pcpu,pmem,args | 
        awk 'FNR > 1 {
          pid=$1; ppid=$2; user=$3; cpu=$4; mem=$5; $1=$2=$3=$4=$5=""; args=$0;
          print pid","ppid","user","cpu","mem","args}'`, {
        shell: true
      })

      let data = ''
      child.stdout.on('data', _data => {
        data += _data
      })

      child.on('close', (errCode) => {
        if (errCode !== 0) return reject(new Error('something error: processInfo'))

        let output = data.toString().trim().split('\n')

        // When no result
        if (output[0].length === 0) return resolve(null)

        resolve(output.map(_data => {
          const d = _data.split(',')

          return {
            pid: parseInt(d[0]),
            ppid: parseInt(d[1]),
            user: d[2].toString().trim(),
            cpu: parseFloat(d[3]),
            mem: parseFloat(d[4]),
            command: d[5].toString().trim(),
            port: pidInfo.reduce((acc, cur) => {
              if (cur.pid !== parseInt(d[0])) return acc
              if (acc.indexOf(cur.port) < 0) acc.push(cur.port)
              return acc
            }, []).sort((a, b) => a - b)
          }
        }).sort((a, b) => a.pid - b.pid))
      })
    })
  }

  function print (data) {
    console.log(chalk.green.bold('PID\tPORT\tPPID\tUSER\tCPU\tMEM\tCOMMAND'))
    data.forEach(_data => {
      _data.port.forEach(port => {
        let color = null
        if (_data.cpu > 70 || _data.mem > 70) color = chalk.red
        else if (_data.cpu > 50 || _data.mem > 50) color = chalk.yellow
        else if (_data.cpu > 30 || _data.mem > 30) color = chalk.magenta
        else color = chalk.default

        console.log(color(`${_data.pid}\t${port}\t${_data.ppid}\t${_data.user}\t${_data.cpu}\t${_data.mem}\t${_data.command}`))
      })
    })
  }

  async function allListeningPort () {
    await rangeListeningPort(['1', '65535'])
  }

  async function singleListeningPort (port) {
    try {
      const pidInfo = await portInListen(port)
      if (pidInfo && pidInfo.length > 0) print(await processInfo(pidInfo))
      else console.log('No result')
    } catch (e) {
      console.error(e)
    }
  }

  async function rangeListeningPort (range) {
    try {
      const pidInfo = await portInListen(`${range[0]}-${range[1]}`)
      if (pidInfo && pidInfo.length > 0) print(await processInfo(pidInfo))
      else console.log('No result')
    } catch (e) {
      console.error(e)
    }
  }
})()
