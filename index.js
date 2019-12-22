/*

MidiDeviceManager module: integrates and coordinates other midi modules
 - Open-ended: works alongside any Midi interface modules.
 - Manages MidiDevice + MidiDeviceControl instances,
 - Saves & loads MidiDevice + MidiDeviceControl configuration to file
 - Trains new & existing MidiDeviceControl bindings

 */


const MidiDevice = require('../midi-device/index.js')
const MidiDeviceConfig = require('../midi-device-config/index.js')
const MidiDeviceTrainer = require('../midi-device-trainer/index.js')
const midiDeviceTrainer = new MidiDeviceTrainer();

const escapePeriod = function(str) {
  str = str.replace(/\./g, '&#46;');
  return str;
}
const unescapePeriod = function(str) {
  str = str.replace(/&#46;/g, '\.');
  return str;
}

const MidiDeviceManager = class {
  constructor() {
    this._midiDevices = []; // available midi hardware is stored here
    this._isTrainingMode = false; // if true, changes the functionality within onInputMessage
    this._onTrained = () => {};
    this._onSaved = () => {};
    //this.loadAll = this.loadAll.bind(this);
    this._midiDeviceControl_onChange = (e) => {
      console.log(e);
    }
  }

  get midiDevices() {
    return this._midiDevices;
  }

  getMidiDeviceById(midiDeviceId) {
    for (let midiDevice of this._midiDevices) {
      if (midiDevice.id == midiDeviceId) {
        return midiDevice;
      }
    }
  }

  nextAvailableDeviceId() {
    return Math.max(...this._midiDevices.map(o => o.id), 0) + 1;
  }

  /**
   * Instantiate MidiDevice instances for currently available hardware, loading controller bindings and other settings respectively
   * @return {[type]}            [description]
   * @param  {MidiAccess} midiAccess contains all info related to currently available MIDI hardware. Created by midi hardware module (e.g. the Web MIDI API)
   */
  async loadAll(midiAccess) {
    // load all config from file
    let conf;
    await MidiDeviceConfig.read().then(value => {
      conf = value;
    });

    // get array of MidiDeviceControls for each MidiDevice from config
    for (let input of midiAccess.inputs.values()) {
      let manufacturer = escapePeriod(input.manufacturer);
      // if not already added
      if (this._midiDevices.filter(device => device.name == input.name).length == 0) {
        let savedDevice = {};
        // check if it has config:
        if (conf[manufacturer]) {
          if (conf[manufacturer][input.name]) {
            savedDevice = conf[manufacturer][input.name];
          }
        }
        // console.dir(midiDeviceControls);
        // add new MidiDevice instance to MidiDeviceManager's collection
        this._midiDevices.push(new MidiDevice({
          id: this.nextAvailableDeviceId(),
          name: input.name,
          manufacturer: manufacturer,
          //midiDeviceControls: midiDeviceControls,
          midiDeviceControls: savedDevice.midiDeviceControls,
          options: savedDevice.options
        }));
      }
    }
    /** @todo: do output ports too? at the moment it's only doing pass-through */
    // for (let output of electronMidi.outputs.values()) {
    //
    // }
  }

  async saveAll() {
    for (let midiDevice of this._midiDevices) {
      await MidiDeviceConfig.save(`${escapePeriod(midiDevice.manufacturer)}.${escapePeriod(midiDevice.name)}.options`, midiDevice.options);
      await MidiDeviceConfig.save(`${escapePeriod(midiDevice.manufacturer)}.${escapePeriod(midiDevice.name)}.midiDeviceControls`, midiDevice.midiDeviceControls);
    }
    this._onSaved();
  }

  saveDevice() {

  }

  async midiDeviceControl_removeBinding() {

  }

  async midiDevice_removeMidiDeviceControl(MidiDeviceId, MidiDeviceControlId) {
    for (var i = 0; i < this._midiDevices.length; i++) {
      if (this._midiDevices[i].id == MidiDeviceId) {
        this._midiDevices[i].deleteMidiDeviceControl(MidiDeviceControlId);
        break;
      }
    }
    await this.saveAll();
  }




  get isTrainingMode() {
    return this._isTrainingMode;
  }

  /**
   * Sets the callback function for when a MidiDeviceControl is trained
   * @param  {Function} fn the callback to execute
   */
  set onTrained(fn) {
    this._onTrained = fn;
  }

  set onSaved(fn) {
    this._onSaved = fn;
  }

  /**
   * 1. (Re)sets the MidiDeviceTrainer instance MidiDevice collection
   * 2. Sets training mode to true, which changes behaviour of onInputMessage so that it also calls midiDeviceTrainer.train
   */
  startTraining() {
    this._isTrainingMode = true;
    // (re)initialize midiDeviceTrainer
    midiDeviceTrainer.midiDevices = this._midiDevices;
    midiDeviceTrainer.onAfterTrained = this._onTrained;
  }

  /**
   * - Sets training mode to false, which prevents calling train(e) in the onMidiMessage handler
   * - Updates midi devices in the user config file
   */
  stopTraining() {
    this._isTrainingMode = false;
    this.saveAll();
  }

  onInputMessage(e) {
    if (this._isTrainingMode) {
      if (midiDeviceTrainer)
        midiDeviceTrainer.train(e);
    }
    // console.log('midi in');
    // console.log(e);
  }
  onOutputMessage(e) {
    // console.log('midi out');
    // console.log(e);
  }




}

module.exports = MidiDeviceManager;

/* ================================== */
/* ====     global functions     ==== */
/* ================================== */
