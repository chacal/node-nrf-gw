const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
const sensorDataDecoder = require('./sensor-data-decoder')
const Bacon = require('baconjs')
const _ = require('lodash')

const BAUD_RATE = 115200


function start(device) {
  return {
    sensorStream: openSensorStream()
  }

  function openSensorStream() {
    return openSerialPort(device)
      .flatMapLatest(port => Bacon.fromEvent(port, 'data'))
      .map(parseRawEvent)
      .filter(_.identity)
      .map(e => {
        const sensorEvent = sensorDataDecoder(Buffer.from(e.data, 'hex'))
        if(!! sensorEvent) {
          sensorEvent.rssi = -e.rssi
        }
        return sensorEvent
      })
      .filter(_.identity)
  }
}

function parseRawEvent(rawEvent) {
  try {
    return JSON.parse(rawEvent)
  } catch(e) {
    return undefined
  }
}

function openSerialPort(device) {
  const port = new SerialPort(device, {baudRate: BAUD_RATE, platformOptions: {vmin: 255, vtime: 0}})
  const parser = new Readline()
  port.pipe(parser)
  return Bacon.fromEvent(port, 'open').map(parser)
    .merge(Bacon.fromEvent(port, 'error', e => new Bacon.Error(e)))
}

module.exports = {
  start
}
