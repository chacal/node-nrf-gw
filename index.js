var Bacon = require('baconjs')
var mqtt = require('mqtt')
var nrf = process.platform === 'linux' ? require('./nrf-receiver.js') : require('./sensor-simulator.js')

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'


Bacon.combineTemplate({ nrf: nrf, mqttClient: startMqttClient(MQTT_BROKER) })
  .onValue(startForwardingEvents)


function startForwardingEvents({nrf, mqttClient}) {
  nrf.sensorStream.onValue(publishEventToMqtt)

  function publishEventToMqtt(event) {
    mqttClient.publish(`/sensor/${event.instance}/${event.tag}/state`, JSON.stringify(event), { retain: true })
  }
}



function startMqttClient(brokerUrl) {
  const client = mqtt.connect(brokerUrl, { queueQoSZero : false })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', e => console.log('MQTT client error', e))

  return Bacon.fromEvent(client, 'connect').first()
    .map(() => client)
}
