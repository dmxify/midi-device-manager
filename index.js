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


const MidiDeviceManager = class {
  constructor() {
    this._midiDevices = []; // available midi hardware is stored here
    this._isTrainingMode = false; // if true, changes the functionality within onInputMessage
    this._onTrained = () => {};
    //this.loadAll = this.loadAll.bind(this);
    this._midiDeviceControl_onChange = (e) => {
      console.log(e);
    }
  }

  /**
   * Instantiate MidiDevice instances for currently available hardware, loading controller bindings and other settings respectively
   * @return {[type]}            [description]
   * @param  {MidiAccess} midiAccess contains all info related to currently available MIDI hardware. Created by midi hardware module (e.g. the Web MIDI API)
   */
  loadAll(midiAccess) {
    // load all config from file
    let conf = MidiDeviceConfig.readConfig();

    // get array of MidiDeviceControls for each MidiDevice from config
    for (let input of midiAccess.inputs.values()) {
      // if not already added
      if (this._midiDevices.filter(device => device.name == input.name).length == 0) {
        let midiDeviceControls = [];
        if (conf[input.name]) {
          if (conf[input.name].controls) {
            midiDeviceControls = conf[input.name].controls;
          }
        }

        // add new MidiDevice instance to MidiDeviceManager's collection
        this._midiDevices.push(new MidiDevice({
          id: input.id,
          name: input.name,
          manufacturer: input.manufacturer,
          midiDeviceControls: midiDeviceControls
        }));
      }
    }

    /** @todo: do output ports too? */
    // for (let output of electronMidi.outputs.values()) {
    //
    // }


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
   * Sets training mode to false, which prevents calling train(e) in the onMidiMessage handler
   */
  stopTraining() {
    this._isTrainingMode = false;
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
