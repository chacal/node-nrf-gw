var _ = require('lodash')

function decodeSensorData(buffer) {
  var data = _.assign(parseTagAndInstance(buffer), { ts: new Date() })

  try {
    switch(data.tag) {
      case 't':
        fillTemperatureData(buffer, data)
        break;
      case 'p':
        fillPressureData(buffer, data)
        break;
      case 'h':
        fillHumidityData(buffer, data)
        break;
      case 'c':
        fillCurrentData(buffer, data)
        break;
      case 'a':
        fillAutopilotRemoteData(buffer, data)
        break;
      case 'w':
        fillTankData(buffer, data)
        break;
      case 's':
        fillRFMGatewayData(buffer, data)
        break;
      case 'r':
        fillLevelReportData(buffer, data)
        break;
      default:
        console.error("Received unknown data!", buffer)
        return
    }
  } catch(err) {
    console.error("Error while decoding received data! Data: ", buffer, "\nError:", err)
    return
  }

  return data
}


function parseTagAndInstance(buffer) {
  const tag = buffer.toString('utf8', 0, 1)
  const instance = buffer.readUInt8(1)
  return { tag, instance, type: isCommandTag(tag) ? 'command' : 'event' }

  function isCommandTag(tag) { return tag === 'a' }  // At the moment only autopilot remote sends commands
}

function fillTemperatureData(buffer, data) {
  data.temperature = buffer.readFloatLE(2)
  data.vcc = buffer.readInt16LE(6)
  data.previousSampleTimeMicros = buffer.readUInt32LE(8)
}

function fillPressureData(buffer, data) {
  data.pressure = buffer.readFloatLE(2)
  data.vcc = buffer.readInt16LE(6)
  data.previousSampleTimeMicros = buffer.readUInt32LE(8)
}

function fillHumidityData(buffer, data) {
  data.humidity = buffer.readFloatLE(2)
  data.vcc = buffer.readInt16LE(6)
  data.previousSampleTimeMicros = buffer.readUInt32LE(8)
}

function fillCurrentData(buffer, data) {
  data.rawMeasurement = buffer.readInt16LE(2)
  data.shuntVoltageMilliVolts = buffer.readFloatLE(4)
  data.current = buffer.readFloatLE(8)
  data.vcc = buffer.readInt16LE(12)
  data.previousSampleTimeMicros = buffer.readUInt32LE(14)
}

function fillAutopilotRemoteData(buffer, data) {
  data.buttonId = buffer.readUInt8(2)
  data.isLongPress = buffer.readUInt8(3) !== 0
  data.vcc = buffer.readInt16LE(4)
  data.previousSampleTimeMicros = buffer.readUInt32LE(6)
}

function fillTankData(buffer, data) {
  data.tankLevel = buffer.readUInt8(2)
  data.vcc = buffer.readInt16LE(3)
  data.previousSampleTimeMicros = buffer.readUInt32LE(5)
}

function fillRFMGatewayData(buffer, data) {
  data.rssi = buffer.readInt16LE(2)
  data.ackSent = buffer.readUInt8(4) !== 0
  data.previousSampleTimeMicros = buffer.readUInt32LE(5)
}

function fillLevelReportData(buffer, data) {
  data.level = buffer.readUInt8(2)
  data.vcc = buffer.readInt16LE(3)
  data.previousSampleTimeMicros = buffer.readUInt32LE(5)
}


module.exports = decodeSensorData

