var Bacon = require('baconjs')
var mqtt = require('mqtt')
var nrf = process.platform === 'linux' ? require('./nrf-receiver.js') : require('./sensor-simulator.js')

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://ha-opi'


Bacon.combineTemplate({ nrf: nrf, mqttClient: startMqttClient(MQTT_BROKER) })
  .onValue(startForwardingEvents)


function startForwardingEvents({nrf, mqttClient}) {
  nrf.sensorStream.onValue(publishEventToMqtt)

  function publishEventToMqtt(event) {
    mqttClient.publish(`/sensor/${event.instance}/${event.tag}/state`, JSON.stringify(event), { retain: true, qos: 1 })
  }
}



function startMqttClient(brokerUrl) {
  const client = mqtt.connect(brokerUrl)
  return Bacon.fromEvent(client, 'connect').first()
    .doAction(() => console.log("Connected to MQTT server"))
    .map(() => client)
}
