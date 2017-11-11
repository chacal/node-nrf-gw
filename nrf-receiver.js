var nrf = require('nrf')
var reverse = require('reverse-string')
var Bacon = require('baconjs')
var _ = require('lodash')
var decodeSensorData = require('./sensor-data-decoder')

var config = {
  spiDevice: process.env.NRF24_SPI_DEVICE ? process.env.NRF24_SPI_DEVICE : "/dev/spidev0.1",
  cePin: 25,                     // GPIO_25
  irqPin: 24,                    // GPIO_24
  channel: 76,                   // 76 is the default channel for RF24 Arduino library
  rxAddress: process.env.NRF24_RX_ADDRESS ? process.env.NRF24_RX_ADDRESS : "nrf01",
  txAddress: process.env.NRF24_TX_ADDRESS ? process.env.NRF24_TX_ADDRESS : "nrf02",
  dataRate: '250kbps',
  crcBytes: 2,
  txPower: 'PA_MAX'
}

console.log("Starting with configuration:\n", config)


var radio = nrf.connect(config.spiDevice, config.cePin, config.irqPin)
var radioStarted = Bacon.fromCallback(radio.reset)
  .flatMapLatest(() => Bacon.fromCallback(radio.dataRate, config.dataRate))
  .flatMapLatest(() => Bacon.fromCallback(radio.channel, config.channel))
  .flatMapLatest(() => Bacon.fromCallback(radio.crcBytes, config.crcBytes))
  .flatMapLatest(() => Bacon.fromCallback(radio.transmitPower, config.txPower))
  .flatMapLatest(() => Bacon.fromCallback(radio.autoRetransmit, {count:10, delay:2000}))
  .flatMapLatest(() => Bacon.fromCallback(radio.begin))
  .flatMapLatest(() => Bacon.fromCallback(radio.setStates, {EN_ACK_PAY:false, EN_DYN_ACK:false}))  // Disable ACK payloads & dynamic ack to get auto ACK function with PA+LNA module

function sensorStream() {
  var rx = radio.openPipe('rx', new Buffer(reverse(config.rxAddress))) // RF24 on Arduino doesn't send data in LSB order -> reverse to match
  return Bacon.fromEvent(rx, 'data').map(dataReceived).filter(_.identity)
    .merge(Bacon.fromEvent(rx, 'error', Bacon.Error))
}

function radioSender() {
  var tx = radio.openPipe('tx', new Buffer(reverse(config.txAddress)))  // RF24 on Arduino doesn't send data in LSB order -> reverse to match
  tx.on('error', e => console.log('Error while sending data', e))
  return tx
}

function dataReceived(buffer) {
  Array.prototype.reverse.call(buffer)        // RF24 on Arduino doesn't send data in LSB order -> reverse to match
  return decodeSensorData(buffer)
}

module.exports = radioStarted.map(() => ({
  sensorStream: sensorStream(),
  radioSender: radioSender()
}))
