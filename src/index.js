const debug = require('debug')('teleopxyz.TeleOp')
const reach = require('./reach')
const yaml = require('yaml')
const path = require('path')

const Pkg = require('../package.json')

const { GamepadListener } = require('gamepad.js')


console.log(Pkg.name, 'v'+Pkg.version, '🤖')
console.log('sense, plan, party 🤘')
console.log('\n\nWelcome fellow humans\n\nset localStorage.debug=\'*\' to activate debug output')

function hasGamepadSupport(){
  return navigator.getGamepads !== undefined
}

const TfTree = require('./TfTree')

class TeleOp {
  constructor(){
    debug('new TeleOp')

    this.ros = null
    this.host = null
    this.fileContent = null
    this.divId = null
    this.viewer = null
    this.tfClient = null
    this.baseLink = null
    this.gamepadListener = null

    this.joyMsg = null
    this.joyIndex = null
    this.joyPub = null
    this.joyEnabled = false
    this.joyUserOptIn = null
    this.joyAutoRepeatRate = 4
    this.joyRepeatTimer = null
  }

  static get version(){
    return Pkg.version
  }

  async connectRos(){
    return new Promise((resolve,reject)=>{

      // Connect to ROS.
      this.ros = new ROSLIB.Ros({
        url : this.host
      });

      this.ros.once('error', (error) => {
        debug('Connection error ' + this.host)
        debug(error)
        reject(error)
      });
      // Find out exactly when we made a connection.
      this.ros.once('connection', () => {
        debug('Connection open ' + this.host)
        resolve()
      })
    })
  }

  onResize(event) {
    debug('resize', event)
    const width = this.div.clientWidth
    const height = this.div.clientHeight
    debug('size', width, height)
    this.viewer.resize(width, height)
  }

  async start(host, rvizFile, divId="viewer"){
    debug('start')

    this.host = host
    this.divId = divId
    this.fileContent = yaml.parse(rvizFile)

    this.div = document.getElementById(this.divId)

    debug('fileContent', this.fileContent)

    await this.connectRos()

    let globalOptions = {
      background: TeleOp.rvizColor2hex(reach(this.fileContent, 'Visualization Manager.Global Options.Background Color'), null),
      fixedFrame: reach(this.fileContent, 'Visualization Manager.Global Options.Fixed Frame', '/base_link'),
      frameRate: reach(this.fileContent, 'Visualization Manager.Global Options.Frame Rate', 30)
    }

    this.viewer = new ROS3D.Viewer({
      divID: this.divId,
      width: this.div.clientWidth,
      height: this.div.clientHeight,
      antialias: true,
      background: globalOptions.background
    });

    window.onresize = (e)=>{this.onResize(e)}

    /*this.viewer.addObject(new ROS3D.Grid({
      color:'#0181c4',
      cellSize: 1.0,
      num_cells: 20
    }));*/


    console.log('Globals', { globalOptions })



    this.tfClient = new ROSLIB.TFClient({
      ros: this.ros,
      serverName: `/tf2_web_republisher`,   //! Need to make configurable and autodetect correct one on the fly
      angularThres: 0.03,
      transThres: 0.01,
      //rate: globalOptions.frameRate,
      fixedFrame: globalOptions.fixedFrame
    })

    if(hasGamepadSupport()){
      debug('enabling gamepad support')
      this.gamepadListener = new GamepadListener({analog: true/*, deadZone: 0.2*/})
      this.gamepadListener.on('gamepad:connected', this.addGamepad.bind(this))
      this.gamepadListener.on('gamepad:disconnected', this.removeGamepad.bind(this))
      this.gamepadListener.on('gamepad:axis', this.onAxisChange.bind(this))
      this.gamepadListener.on('gamepad:button', this.onAxisChange.bind(this))
  
      this.gamepadListener.start() 
    }

    await this.renderFromFile()
  }

  addGamepad(event){
    debug('addGamepad', event)
    const gamepad = reach(event, 'detail.gamepad')

    if(this.joyUserOptIn == null){
      debug('prompting user for gamepad/joy support opt-in')
      this.joyUserOptIn = window.confirm('Gamepad detected - would you like to use it as a /joy publisher?\n\n'+gamepad.id)
      this.joyEnabled = this.joyUserOptIn

      debug('joyUserOptIn =', this.joyUserOptIn)
    }

    if(this.joyUserOptIn == false){ return }

    this.joyEnabled = true

    if(this.joyPub == null){
      this.joyIndex = reach(event, 'detail.index')
      
      debug('advertising /joy idx=',this.joyIndex)
      this.joyPub = new ROSLIB.Topic({
        ros : this.ros,
        name : '/joy',
        messageType : 'sensor_msgs/Joy'
      })
  
      this.joyPub.advertise()

      this.updateJoy(gamepad)

    }
  }

  removeGamepad(event){
    debug('removeGamepad', event)

    //! cleanup timer
    if(this.joyRepeatTimer != null){
      clearTimeout(this.joyRepeatTimer)
      this.joyRepeatTimer = null
    }

    //! cleanup publisher
    if(this.joyPub != null && event.detail.index == this.joyIndex){
      this.joyPub.unadvertise()
    }


    this.joyPub = null
    this.joyIndex = null
    //this.joyUserOptIn = null
    this.joyEnabled = false
  }

  getJoyMsgFromGamepad(gamepad){
    return new ROSLIB.Message({
      axes: [...gamepad.axes],
      buttons: gamepad.buttons.map( btn => parseInt(btn.value) )
    })
  }

  autoUpdateJoy(){
    if(this.joyMsg!=null && this.joyEnabled == true){
      this.joyPub.publish(this.joyMsg)

      this.joyRepeatTimer = null
      this.debounceJoyAutoUpdate()
    }
  }

  debounceJoyAutoUpdate(){
    if(this.joyAutoRepeatRate > 0.0){
      let repeatMs = 1000.0 / this.joyAutoRepeatRate
      if(this.joyRepeatTimer != null){
        clearTimeout(this.joyRepeatTimer)
      }

      //! set timer further into the future
      this.joyRepeatTimer = setTimeout(this.autoUpdateJoy.bind(this), repeatMs)

    }
  }

  updateJoy(gamepad){

    if(!this.joyEnabled){return}

    this.joyMsg = this.getJoyMsgFromGamepad(gamepad)

    this.joyPub.publish(this.joyMsg)
    this.debounceJoyAutoUpdate()
  }

  onAxisChange(event){
    if(this.joyIndex != reach(event,'detail.index')){ return }

    const gamepad = reach(event, 'detail.gamepad')
    this.updateJoy(gamepad)
  }

  onButtonChange(event){
    if(this.joyIndex != reach(event,'detail.index')){ return }

    const gamepad = reach(event, 'detail.gamepad')
    this.updateJoy(gamepad)
  }

  async getFile(path){
    debug('getFile', path)
    const fileClient = new ROSLIB.Service({
      ros : this.ros,
      name : '/file_server/get_file',
      serviceType : 'file_server/GetBinaryFile'
    })

    const request = new ROSLIB.ServiceRequest({
      name: path
    })
  
    return await new Promise((resolve,reject)=>{

      fileClient.callService(request, (result) => {
        debug('Result for service call on ' + fileClient.name + ': ' + result.value.length +'bytes')

        resolve( atob(result.value) )
      }, reject)

    })
  }

  async onServiceWorkerMessage(message){
    debug('srv says')

    switch(reach(message,'data.type')){
      case 'fetch-intercept-request':
        if(this.ros){
          debug('handling fetch intercept via connected ROS device', message.data.path)

          const path = reach(message, 'data.path', '').replace('/virtual/pkg/', 'package://')
          const fileContent = await this.getFile(path)

          debug('sending service worker file ', path)

          message.source.postMessage({
            type: 'fetch-intercept-response',
            path: message.data.path,
            data: fileContent
          })

        }
        break;
    }
  }

  async renderFromFile(){

    let displays = reach(this.fileContent, 'Visualization Manager.Displays', [])

    for(let display of displays){
      //debug(`parsing display '${display.Class}'`, { display })

      if(!display.Enabled){
        debug(`skipping ${display.Class}`)
        continue
      }

      let obj = undefined;
      switch (display.Class) {
        case 'rviz/Grid':
          debug('display.color', display.Color)
          obj=new ROS3D.Grid({
            color: TeleOp.rvizColor2hex(display.Color, '#ff1010'),
            cellSize: display['Cell Size'],
            num_cells: display['Plane Cell Count']
          })
          this.viewer.addObject(obj)
          break
        case 'rviz/TF':
          debug(display.Class, display.Name)
          const allEnabled = display.Frames['All Enabled'] || false

          const frames = Object.fromEntries(
            Object.entries(display.Frames)
            .map(([key,value])=> {
              return [key, allEnabled || value.Value && true]
            })
            .filter(([key, value]) => key != 'All Enabled')
          )
          
          debug('\t','frames', frames)
          obj = new TfTree({
            frames,
            ros: this.ros,
            tfClient: this.tfClient,
            rootObject: this.viewer.scene,
            scale: parseFloat(display['Marker Scale']),
            showAxes: display['Show Axes'],
            showNames: display['Show Names'],
            showArrows: display['Show Arrows']
          })

          await obj.setup()
          break;
        case 'rviz/LaserScan':
          debug(display.Class, display.Topic)

          obj = new ROS3D.LaserScan({
            ros: this.ros,
            topic: `${display.Topic}`,
            tfClient: this.tfClient,
            color: display.color, // need to check if this is in the right format
            // texture: , // (optional) Image url for a texture to use for the points. Defaults to a single white pixel.
            rootObject: this.viewer.scene,
            material: {
              size: display['Size (Pixels)'], // (optional) defaults to 0.05
            },
            max_pts: 50000 // (optional) defaults to 100
          })
          break
        case 'rviz/PointCloud2':
          debug(display.Class, display.Topic)
          obj = new ROS3D.PointCloud2({
            ros: this.ros,
            topic: `${display.Topic}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient,
            max_pts: 50000,
            //colorsrc: display["Color Transformer"],
            material: { 
              size: 0.02
            }
          })

          //debug('\t','pt', display["Color Transformer"])
          break
        case 'rviz/Marker':
          debug(display.Class, display['Marker Topic'])
          obj = new ROS3D.MarkerClient({
            ros: this.ros,
            topic: `${display['Marker Topic']}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient
          })
          break
        case 'rviz/MarkerArray':
          debug(display.Class, display['Marker Topic'])
          obj = new ROS3D.MarkerArrayClient({
            ros: this.ros,
            topic: `${display['Marker Topic']}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient
          })
          break
        case 'rviz/Map':
          debug(display.Class, display.Topic)
          obj = new ROS3D.OccupancyGridClient({
            ros: this.ros,
            topic: `${display.Topic}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient,
            continuous: true
          })
          break
        case 'rviz/Odometry':
          debug(display.Class, display.Topic)
          obj = new ROS3D.Odometry({
            ros: this.ros,
            topic: `${display.Topic}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient,
            keep: display.Keep,
            length: reach(display, 'Shape.Axes Length'),
            headlength: reach(display, 'Shape.Head Length'),
            shaftLength: reach(display, 'Shape.Shaft Length'),
            headDiameter: reach(display, 'Shape.Head Radius')*2.0,
            shaftDiameter: reach(display, 'Shape.Shaft Radius')*2.0,
            color: TeleOp.rvizColor2hex(reach(display,'Shape.Color'), '#cc00ff')
          })
          break
        case 'rviz/Path':
          debug(display.Class)
          obj = new ROS3D.Path({
            ros: this.ros,
            topic: `${display.Topic}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient,
            color: TeleOp.rvizColor2hex(display.Color, '#cc00ff')
          })
          break
        case 'rviz/RobotModel':
          debug(display.Class)
          //console.log(display)

          let paramPath = path.join('/', display['Robot Description'])

          //console.log(paramPath)

          const urdfText = await new Promise((resolve,reject)=>{
            let descParam = new ROSLIB.Param({
              ros: this.ros, name: paramPath
            })

            descParam.get(val=>{ resolve(val) })
          })

          debug('\t','urdf', urdfText)

          let publicModelPath = '/virtual/pkg/'
          if(urdfText != null && urdfText.length > 0){
            /*let parser = new DOMParser()
            let xmlDoc = parser.parseFromString(urdfText, 'text/xml')

            const robotTag = xmlDoc.getElementsByTagName('robot')[0]
            const robotName = robotTag.getAttribute('name')
            debug('\t','urdf robot name', robotName, robotName.indexOf('magni'))
            if(robotName.indexOf('magni') != -1){
              publicModelPath = 'https://raw.githubusercontent.com/UbiquityRobotics/magni_robot/noetic-devel'
            }*/

            try{
              obj = new ROS3D.UrdfClient({
                path: publicModelPath,
                ros: this.ros,
                param: paramPath,
                rootObject: this.viewer.scene,
                tfClient: this.tfClient,
                tfPrefix: display['TF Prefix']
              })
            }
            catch(err){
              debug('\t','urdf error', err)
              //delete obj
              obj = null
            }
            
  
            debug('\t',obj)
          }
          
          break
        case 'rviz/InteractiveMarkers':
          debug(display.Class, display['Update Topic'])

          const topic = display['Update Topic'].replace('/update','')

          debug('\t', 'topic', topic)

          obj = new ROS3D.InteractiveMarkerClient({
            topic,
            ros: this.ros,
            tfClient: this.tfClient,
            camera: this.viewer.camera,
            rootObject: this.viewer.selectableObjects,
          })

          break;
        case 'rviz/PointStamped':
          debug(display.Class, display['Topic'])

          obj = new ROS3D.Point({
            ros: this.ros,
            tfClient: this.tfClient,
            topic: display['Topic'],
            color: TeleOp.rvizColor2hex(display['Color']),
            radius: display['Radius']
          })
          break;
        case 'rviz/Polygon':
          debug(display.Class, display['Topic'])

          obj = new ROS3D.Polygon({
            ros: this.ros,
            tfClient: this.tfClient,
            topic: display['Topic'],
            color: TeleOp.rvizColor2hex(display['Color'])
          })

          break;
        case 'rviz/Pose':
        case 'rviz/PoseArray':
        case 'rviz/PoseWithCovariance':
          debug(display.Class, display['Topic'])
          const type = display.Class.replace('rviz/', '')
          const Class = ROS3D[type]

          obj = new Class({
            ros: this.ros,
            tfClient: this.tfClient,
            topic: display['Topic'],
            color: TeleOp.rvizColor2hex(display['Color']),
            length: reach(display, 'Axes Length'),
            headlength: reach(display, 'Head Length'),
            shaftLength: reach(display, 'Shaft Length'),
            headDiameter: reach(display, 'Head Radius')*2.0,
            shaftDiameter: reach(display, 'Shaft Radius')*2.0
          })

          break;
        default:
          console.warn(`display class '${display.Class}' not supported`)
          console.warn(display)
          break
      }

      if (obj) {
        debug(obj)
      }
    }

  }



  disableViz() {
    /** @todo */
    debug('disable viz - not implemented')
  }


  static rvizColor2hex(color, defaultHex) {
    if (!color) { return defaultHex }
    return TeleOp.rgb2hex(color.replace(/;/g, ','))
  }
  
  static rgb2hex(rgb) {
    rgb = rgb.match(/[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (rgb && rgb.length === 4) ? "#" +
      ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
      ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
      ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
  }
}

module.exports=TeleOp;
