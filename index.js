var Bacon = require('baconjs')
var mqtt = require('mqtt')
var UartReceiver = require('./uart-receiver')

const UART_DEVICE = process.env.UART_DEVICE || '/dev/ttyAMA0'
const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined

startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD)
  .onValue(mqttClient => {
    const uart = UartReceiver.start(UART_DEVICE)
    startForwardingEvents(uart.sensorStream, mqttClient)
  })


function startForwardingEvents(sensorStream, mqttClient) {
  sensorStream.onValue(publishEventToMqtt)

  function publishEventToMqtt(event) {
    if(event.type === 'command') {
      mqttClient.publish(`/command/${event.instance}/${event.tag}/state`, JSON.stringify(event))  // Don't retain, qos 0
    } else {
      mqttClient.publish(`/sensor/${event.instance}/${event.tag}/state`, JSON.stringify(event), { retain: true, qos: 1 })
    }
  }
}

function startSendingCommands(nrf, mqttClient) {
  mqttClient.subscribe('/nrf-command')
  mqttClient.on('message', onNrfCommand)

  function onNrfCommand(topic, message) {
    console.log(`nRF TX: [${message.toString('hex')}]`)
    nrf.radioSender.write(Array.prototype.reverse.call(message))    // RF24 on Arduino doesn't send data in LSB order -> reverse to match
  }
}



function startMqttClient(brokerUrl, username, password) {
  const client = mqtt.connect(brokerUrl, { queueQoSZero : false, username, password })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', e => console.log('MQTT client error', e))

  return Bacon.fromEvent(client, 'connect').first()
    .map(() => client)
}
