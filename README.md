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
 * [rosbridge_suite](http://wiki.ros.org/rosbridge_suite)

See [`example/point_cloud.launch`](example/point_cloud.launch) for a typical roslaunch configuration.

## Follow and Support

 * [Twitter](https://twitter.com/datapartyjs)
 * Donate 🤲
   * Cash.App - [$datapartyllc](https://cash.app/DatapartyLLC)
   * $btc - `37gHpAMCeYutB8DNbSnxHfwpuqSEs4kFAq`
   * $eth - `0x430c1Bf9CbbbEA845651Ba1536d4B9795696dD5d`

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
