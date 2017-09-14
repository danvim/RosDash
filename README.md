# RosDash

## Author

Daniel Cheung

## Introduction

This minimal library is built on top of RosBridge to provide a easier GUI development. This library depends on **Vue.js**. This library suggests a particular coding style using Vue.js, and the actual number of provided methods are not many.

RosDash provides an easier way to debug the JavaScript client of ROS. Because of some unknown design reasons, ROS does not return any error if messages are not well constructed and are published through RosBridge.

### Understanding Vue.js

Vue.js is a framework that manages a "virtual DOM". It performs way better than simply updating DOM with methods like jQuery, which changes the inner HTML of an element, forcing the browser to update the DOM in response. Vue.js, however, strongly binds values in the DOM to a JavaScript system. Updating texts in the DOM becomes much faster through Vue.js because it directly updates the DOM, unlike jQuery.

## Using RosDash

**RosDash recommends centralizing all data listened from ROS, and are saved to the same place.** 

1. Initializing all properties to be used to store data in a message under the Dashboard Vue.js instance.
   ```
   # Example message file
   # Gearshift.msg

   std_msgs/Bool reverse_mode
   std_Int8/Int8 speed_mode
   std_msgs/Int8 camera_profile_current
   ```
   Instantiate a Vue.js instance and declare initial values for fields in the message files. You may make up your own names for the properties, but the suggested way is to suffix the field name after the message type/purpose.
   ```javascript
   let dashboard = new Vue({
       el: "#dashboard-root", //root of the Vue.js element
       data: {
           data: { //Collection of all data from ROS
               //Give default values to all properties you intend to use
               gearshift_reverse_mode: false,
               gearshift_speed_mode: 0,
               gearshift_camera_profile_current: 0
           }
       }
   });
   ```

2. Bind values to DOM by creating templates under the root specified when creating the Vue.js instance. In this case, it's `#dashboard-root`.
   ```html
   <main id="dashboard-root">
       <!--A really basic Vue.js template string.-->
       <span>Reverse Mode: {{data.gearshift_reverse_mode}}</span>
   </main>
   ```
   The above template is converted to a proper DOM element when the Vue.js element is properly initiated, with the handlebars(`{{...}}`) be made into a one way binding text that updates when `dashboard.data.gearshift_reverse_mode` is properly updated by properly assigning values. *(Vue.js uses **getters** and **setters** to dynamically bind DOM values when the JavaScript properties are changed. Changing stored data without accessing getters and setters would not inform Vue.js to update dependencies. You may read more about getters and setters on [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set).)*

   ```HTML
   <!--DOM when dashboard is just initiated.-->
   <main id="dashboard-root">
       <span>Reverse Mode: false</span>
   </main>
   ```

3. Create a `RosCon` instance.

   ```javascript
   let rosCon = new RosCon({vue: dashboard});
   ```

4. Listen to the ROS topic.

   ```javascript
   rosDash.listen(new ROSLIB.Topic({
       name: "teleop/gearshift",
       messageType: "beluga_msgs/Gearshift"
   }), function(messageData, dashboardData) {
       //Using the most basic method of assignment is the fastest.
       //ES6 destructuring assignment is getting faster and by the time I'm writing this, it is quite similar to the speed of this method.
       dashboardData.gearshift_reverse_mode = messageData.reverse_mode.data;
       dashboardData.gearshift_speed_mode = messageData.speed_mode.data;
       dashboardData.gearshift_camera_profile_current = messageData.camera_profile_current.data;
   });
   ```

   The `rosDash.listen()` function accepts a `ROSLIB.Topic` instance and a callback function to assign values into the data object within the `dashboard` Vue.js instance. In this way, information from Ros may be displayed swiftly by Vue.js using data binding.

5. Publish messages to ROS topic.

   ```html
   <main id="dashboard-root">
       <span>Reverse Mode: {{data.gearshift_reverse_mode}}</span>
       <button typoe="button" v-on:click="toggleReverseMode()">Toggle reverse mode</button>
   </main>
   ```

   ```javascript
   //Save topic to rosCon instance
   rosCon.confirmTopicExists(new ROSLIB.Topic({
       name: "gui/gearshift",
       messageType: "beluga_msgs/Gearshift"
   }));

   let dashboard = new Vue({
       el: "#dashboard-root", //root of the Vue.js element
       data: {
           data: { //Collection of all data from ROS
               //...
           }
       },
       methods: {
           toggleReverseMode: function() {
               let new_reverse_mode = !dashboard.data.gearshift_reverse_mode;
               rosCon.publish("gui/gearshift", {
                   reverse_mode: {data: {dashboard.data.gearshift_reverse_mode = new_reverse_mode}},
                   speed_mode: {data: {dashboard.data.gearshift_speed_mode}},
                   camera_profile_current: {data: {dashboard.data.camera_profile_current}}
               });
           }
       }
   });
   ```

With the above steps, the whole listening and publishing cycle is complete, although there are other methods in the library to explore and use.