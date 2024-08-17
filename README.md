# teleop.xyz 🤖

[teleop.xyz](https://teleop.xyz)

`sense, plan, party 🤘` 


## Usage

 * Visit [teleop.xyz](https://teleop.xyz)
 * Enter rosbridge websocket address (ie: `ws://myrobot.local:4000`)
 * Select RViz file
 * Click 'connect'
 * Party! 🎉

## Requirements 

 * Device running [ROS](https://www.ros.org/) 🤖
 * [rosbridge_websocket](http://wiki.ros.org/rosbridge_suite)
 * [tf2_web_republisher](https://github.com/RobotWebTools/tf2_web_republisher)
 * [rosapi](https://github.com/RobotWebTools/rosbridge_suite)

 Optional
 * [file_server](https://github.com/gramaziokohler/ros_file_server)
 * [web_video_server](http://wiki.ros.org/web_video_server)
 * [depthcloud_encoder](http://wiki.ros.org/depthcloud_encoder)
 * [point_downsample](https://github.com/sevenbitbyte/waas/tree/develop/point_downsample)

See [`example/point_cloud.launch`](example/point_cloud.launch) for a typical roslaunch configuration.

## Follow and Support

 * [Twitter](https://twitter.com/datapartyjs)
 * Donate 🤲
   * Cash.App - [ko-fi/dataparty](https://ko-fi.com/dataparty)
   
## Video Demo

[![Video of connecting to ROS device](http://img.youtube.com/vi/F6qQgA2zwfc/0.jpg)](http://www.youtube.com/watch?v=F6qQgA2zwfc)
[![Video of using a gamepad](http://img.youtube.com/vi/Qp8GtCJoLKM/0.jpg)](http://www.youtube.com/watch?v=Qp8GtCJoLKM)

## Roadmap 🗺️

 * Create & modify rviz settings
 * Mobile browser layout 📱
 * Improved error handling
 * Offline support ✈️
 * Remember settings 💾
 * Extend visualizer 📺
   * TF tree
   * graphs
   * images
 * Network optimization 📡
   * images
   * point clouds
 * Extend Input Methods 🎮
 * Sharing 📨
 * ... and much more ✨ 


## Troubleshooting

Having trouble using teleop?

Look for similar issues in our [bug tracker](https://github.com/datapartyjs/teleop-xyz/issues) or try common work arounds below.

### Connection error when using `ws://` instead of `wss://`

Modern web browsers frown upon mixing secure and insecure connections. If you are using the app with an insecure ros_bridge websocket, in the format of `ws://...` you will need to try one of the following solutions.


 * Visit the `http` version of the site at [http://teleop.xyz](http://teleop.xyz)
   * Use incognito mode
 * Make a browser exception. [See this guide](https://www.damirscorner.com/blog/posts/20210528-AllowingInsecureWebsocketConnections.html)
