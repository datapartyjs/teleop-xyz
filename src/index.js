const debug = require('debug')('teleop')
const reach = require('./reach')
const yaml = require('yaml-js')
const path = require('path')

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
  }

  async connectRos(){
    return new Promise((resolve,reject)=>{

      // Connect to ROS.
      this.ros = new ROSLIB.Ros({
        url : this.host
      });

      this.ros.on('error', (error) => {
        debug('Connection error ' + this.host)
        debug(error)
        reject(error)
      });
      // Find out exactly when we made a connection.
      this.ros.on('connection', () => {
        debug('Connection open ' + this.host)
        resolve()
      })
    })
  }

  async start(host, rvizFile, divId="viewer"){
    debug('start')

    this.host = host
    this.divId = divId
    this.fileContent = yaml.load(rvizFile)

    debug('fileContent', this.fileContent)

    await this.connectRos()

    let globalOptions = {
      background: TeleOp.rvizColor2hex(reach(this.fileContent, 'Visualization Manager.Global Options.Background Color'), null),
      fixedFrame: reach(this.fileContent, 'Visualization Manager.Global Options.Fixed Frame', '/base_link'),
      frameRate: reach(this.fileContent, 'Visualization Manager.Global Options.Frame Rate', 30)
    }

    this.viewer = new ROS3D.Viewer({
      divID: this.divId,
      width: window.innerWidth,
      height: window.innerHeight-70,
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

    let displays = reach(this.fileContent, 'Visualization Manager.Displays', [])

    for(let display of displays){
      debug(`parsing display '${display.Class}'`, { display })

      if(!display.Enabled){
        debug(` not enabled`)
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
          console.log(display)
          const allEnabled = display.Frames['All Enabled'] || false

          const frames = Object.fromEntries(
            Object.entries(display.Frames)
            .map(([key,value])=> {
              return [key, allEnabled || value.Value && true]
            })
            .filter(([key, value]) => key != 'All Enabled')
          )
          
          console.log('frames', frames)
          obj = new TfTree({
            frames,
            ros: this.ros,
            tfClient: this.tfClient,
            rootObject: this.viewer.scene,
            scale: display['Marker Scale'],
            showAxes: display['Show Axes'],
            showNames: display['Show Names'],
            showArrows: display['Show Arrows']
          })
          break;
        case 'rviz/LaserScan':
         console.warn(display.Class, 'support is in development and untested')
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

          console.log('pt', display["Color Transformer"])
          break
        case 'rviz/Marker':
          obj = new ROS3D.MarkerClient({
            ros: this.ros,
            topic: `${display['Marker Topic']}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient
          })
          break
        case 'rviz/MarkerArray':
          obj = new ROS3D.MarkerArrayClient({
            ros: this.ros,
            topic: `${display['Marker Topic']}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient
          })
          break
        case 'rviz/Map':
          obj = new ROS3D.OccupancyGridClient({
            ros: this.ros,
            topic: `${display.Topic}`,
            rootObject: this.viewer.scene,
            tfClient: this.tfClient,
            continuous: true
          })
          break
        case 'rviz/Odometry':
          debug(display.Class)
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
          console.log(display)

          let paramPath = path.join('/', display['Robot Description'])

          console.log(paramPath)

          const urdfText = await new Promise((resolve,reject)=>{
            let descParam = new ROSLIB.Param({
              ros: this.ros, name: paramPath
            })

            descParam.get(val=>{ resolve(val) })
          })

          console.log('urdf', urdfText)

          let publicModelPath = ''
          if(urdfText.length > 0){
            let parser = new DOMParser()
            let xmlDoc = parser.parseFromString(urdfText, 'text/xml')

            const robotTag = xmlDoc.getElementsByTagName('robot')[0]
            const robotName = robotTag.getAttribute('name')
            console.log('urdf robot name', robotName, robotName.indexOf('magni'))
            if(robotName.indexOf('magni') != -1){
              publicModelPath = 'https://raw.githubusercontent.com/UbiquityRobotics/magni_robot/noetic-devel'
            }
          }
          

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
            console.log('urdf error', err)
            //delete obj
            obj = null
          }
          

          console.log(obj)
          break
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

  onResize(event) {
    debug('resize')

    this.viewer.resize(event.target.innerWidth, event.target.innerHeight-70)
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