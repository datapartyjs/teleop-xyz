
class TfTree extends THREE.Object3D {
  constructor({ros, tfClient, rootObject, frames, scale, showArrows, showAxes, showNames}){
    super()
    this.ros = ros
    this.tfClient = tfClient
    this.rootObject = rootObject
    this.axisScale = scale || 1.0
    this.frames = frames  //! Map of frameName to frameEnabled

    this.sceneNodes = {}

    this.tfSub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/tf',
      messageType: 'tf/tfMessage'
    })

    this.tfStaticSub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/tf_static',
      messageType: 'tf2_msgs/TFMessage'
    })

    this.listenForFrames()
  }

  listenForFrames(){
    this.tfSub.subscribe(this.handleTfMessage.bind(this))
    this.tfStaticSub.subscribe(this.handleTfMessage.bind(this))
    setTimeout(this.stopListeningForFrames.bind(this), 2000)
  }

  handleTfMessage(msg){
    for(let transform of msg.transforms){

      if(this.frames[transform.header.frame_id] === undefined){
        this.frames[transform.header.frame_id] = true
      }

      if(this.frames[transform.child_frame_id] === undefined){
        this.frames[transform.child_frame_id] = true
      }
    }

  }

  stopListeningForFrames(){
    this.tfSub.unsubscribe()
    this.tfStaticSub.unsubscribe()

    this.subscribe()
  }

  //! Subscribe to needed Tf frames
  subscribe(){

    for(const [frame, enabled] of Object.entries(this.frames)){

      if(enabled){
        //console.log('adding', frame)
        let axis = new ROS3D.Axes({
          shaftRadius: 0.03,
          headRadius: 0.075,
          headLength: 0.3,
          scale: this.axisScale,
          lineType: 'full',
          lineDashLength: 0.1
        })

        this.sceneNodes[frame] = new ROS3D.SceneNode({
          frameID: frame,
          tfClient: this.tfClient,
          object: axis
        })

        this.rootObject.add(this.sceneNodes[frame])
      }
    }
  }

}

module.exports=TfTree;