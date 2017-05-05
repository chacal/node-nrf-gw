var Bacon = require('baconjs')
var mqtt = require('mqtt')
var nrf = process.platform === 'linux' ? require('./nrf-receiver.js') : require('./sensor-simulator.js')

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined


Bacon.combineTemplate({ nrf: nrf, mqttClient: startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD) })
  .onValue(startForwardingEvents)


function startForwardingEvents({nrf, mqttClient}) {
  nrf.sensorStream.onValue(publishEventToMqtt)

  function publishEventToMqtt(event) {
    mqttClient.publish(`/sensor/${event.instance}/${event.tag}/state`, JSON.stringify(event), { retain: true })
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
