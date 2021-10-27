const debug = require('debug')('teleopxyz.TfTree')
const path = require('path')

async function getTopicType(ros, topic){
  return new Promise((resolve, reject)=>{
    ros.getTopicType(topic, resolve, reject)
  })
}


function cleanPath(str){
  return path.join('/', str)
}


class TfTree extends THREE.Object3D {
  constructor({ros, tfClient, rootObject, frames, scale, showArrows, showAxes, showNames}){
    super()
    this.ros = ros
    this.tfClient = tfClient
    this.rootObject = rootObject
    this.axisScale = scale || 1.0
    this.frames = {} //! Map of frameName to frameEnabled

    for(const [frame, enabled] of Object.entries(frames)){
      this.markFrame(frame, enabled)
    }

    this.sceneNodes = {}

    this.tfSub = null

    this.tfStaticSub = null

  }


  async setup(){
    const [tfType, tfStaticType] = await Promise.all([
      getTopicType(this.ros, '/tf'),
      getTopicType(this.ros, '/tf_static')
    ])

    debug('types', tfType, tfStaticType)

    this.tfSub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/tf',
      messageType: tfType
    })

    this.tfStaticSub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/tf_static',
      messageType: tfStaticType
    })

    this.listenForFrames()
  }

  listenForFrames(){
    this.tfSub.subscribe(this.handleTfMessage.bind(this))
    this.tfStaticSub.subscribe(this.handleTfMessage.bind(this))
    setTimeout(this.stopListeningForFrames.bind(this), 3000)
  }

  frameExists(frame_id){
    return this.frames[cleanPath(frame_id)] !== undefined
  }

  markFrame(frame, value){
    const frame_id = cleanPath(frame)
    if(!this.frameExists(frame_id)){
      debug('discovered frame', frame_id)
      this.frames[frame_id] = value
    }
  }
  

  handleTfMessage(msg){
    for(let transform of msg.transforms){
      this.markFrame(transform.child_frame_id, true)
      this.markFrame(transform.header.frame_id, true)
    }
  }



  stopListeningForFrames(){
    debug('stopListeningForFrames done')
    this.tfSub.unsubscribe()
    this.tfStaticSub.unsubscribe()

    this.subscribe()
  }

  //! Subscribe to needed Tf frames
  subscribe(){

    for(const [frame, enabled] of Object.entries(this.frames)){

      if(enabled){
        debug('subscribing to frame', frame)
        let axis = new ROS3D.Axes({
          lineType: 'full',
          shaftRadius: 0.04,
          scale: this.axisScale/5.0,
        })

        this.sceneNodes[frame] = new ROS3D.SceneNode({
          frameID: frame,
          tfClient: this.tfClient,
          object: axis
        })

        this.rootObject.add(this.sceneNodes[frame])
      }
      else {
        debug('ignoring frame', frame)
      }
    }
  }

}

module.exports=TfTree;