/**
 * RosDash.js v1.0.0
 * Copyright 2017 Daniel Cheung
 *
 * Created at: 25/8/2017
 */

Vue.component("dropdown", {
    props: {
        id: {required: true},
        buttonClass: {default: "btn-primary"}
    },
    data: () => {return {
        selected: {},
        selectables: []
    }},
    template: `
<div class="btn-group btn-block dropdown" :id="id">
    <button type="button" class="btn btn-block dropdown-toggle" :class="buttonClass" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span class="selected">{{selected.name}}</span>
    </button>
    <div class="dropdown-menu">
        <slot></slot>
    </div>
</div>`,
    mounted: function () {
        this.selectables = this.$children;
        this.selected = this.selectables[0];
    }
});

Vue.component("dropdown-item", {
    props: {
        value: {required: true}
    },
    data: () => {return {
        name: "",
        data: this.id
    }},
    template: `<a class="dropdown-item"><slot></slot></a>`,
    mounted: function () {
        this.name = this.$slots.default[0].text;
    }
});


/**
 * Vue instance that wraps the dashboard element
 */
let Dashboard = new Vue({
    el: "#dashboard-root"
});






/**
 * RosCon.listen(topicName, messageType, translationObject)
 * Dashboard.data[predefinedName] //bound to DOM
 */

/**
 * Constructor of {@link RosCon}
 * @constructor
 */
function RosCon(settings = {}) {
    this._url = settings.url || "ws://10.10.10.100:9090";
    this._topics = {};
    this._validations = {};
    this.validationFails = [];

    /**
     * Whether or not the messages must be validated before publishing.
     * @type {boolean}
     */
    this.validationFlag = settings.validationFlag || false;
    /**
     * Prevents messages from publishing if validation for that message type used in the topic is not set.
     * @type {boolean}
     */
    this.strictValidation = settings.strictValidation || false;

    this.onMessageValidationFail = settings.onMessageValidationFail || this.onMessageValidationFail();

    this.onConnect = settings.onConnect;
    this.onError = settings.onError;
    this.onClose = settings.onClose;

    this.ros = new ROSLIB.Ros({url: rosConnections._url});

    let $this = this;

    this.ros.on('connection', function () {
        console.info('[STATUS] Connected to websocket server.');
        $this.onConnect();
    });
    this.ros.on('error', function (error) {
        console.error('[STATUS] Error connecting to websocket server: ', error);
        $this.onError();
    });
    this.ros.on('close', function () {
        console.info('[STATUS] Connection to websocket server closed.');
        setTimeout(()=>{
            $this.ros.connect($this._url);
        },1000);
        $this.onClose();
    });
}

RosCon.prototype = {
    /**
     * Makes sure the ROSLIB Topic is registered. If the Topic is not registered, it will be registered.
     *
     * @param {ROSLIB.Topic} topic A ROSLIB Topic. Create one with <code>new ROSLIB.Topic(settingsObject)</code>
     * @return {ROSLIB.Topic|boolean} Returns the topic is the topic is newly added. Otherwise, returns false.
     */
    confirmTopicExists: function(topic) {
        if (topic.name === "" || typeof topic.name === "undefined") {
            console.error("[ERROR] Topic name must not be undefined");
            return false;
        }
        if (typeof this._topics[topic.name] === "undefined")
            return this._topics[topic.name] = topic;
        return false;
    },

    /**
     * Retrieves the saved topic in RosCon. New topics may be saved by using the {@link confirmTopicExists} method.
     * @param topicName
     * @return {ROSLIB.Topic|undefined} Returns the ROSLIB Topic if it exists. Otherwise, returns undefined.
     */
    getTopicByName: function(topicName) {
        return this._topics[topicName];
    },

    /**
     * Listens to a ROS Topic, then updates the <code>data</code> property object in Vue {@link Dashboard} instance. Though using this method is not a necessary way to listen to a ROS topic through RosBridge, this method provides a way to debug and integrate with the Vue {@link Dashboard} instance. Performance is also greatly increased when information display is updated through data binding frameworks like Vue.
     * @param {ROSLIB.Topic} topic A ROSLIB Topic
     * @param {RosCon~assignmentCallback|function} assignmentCallback Callback function used for data assignment. This callback function is used because it can greatly increase performance by doing basic value assignments, rather than much slower ways which include looping.
     */
    listen: function(topic, assignmentCallback) {

        let t;
        if (t = this.confirmTopicExists(topic)) {
            let hasConnected = false;
            console.info("[STATUS] Attempting to subscribe to topic: " + t.name);
            t.subscribe(function (message) {
                if (!hasConnected) {
                    console.info("[STATUS] Subscribed to topic: " + t.name);
                    hasConnected = true;
                }

                if (typeof assignmentCallback === "function") {
                    /**
                     * Callback function used for data assignment.
                     * @callback assignmentCallback
                     * @type function
                     * @memberOf RosCon
                     * @param {object} dashboardData Dashboard Data
                     * @param {object} message Topic message
                     * @example
                     * <pre><code>
                     * //Assigns message.a.data to dashboardData.x and message.b.data to dashboardData.y.
                     * //The JavaScript ES6 destructive assignment. (much slower performance)
                     * function(message, dashboardData){
                     *     ({
                     *         a:{data:dashboardData.x},
                     *         b:{data:dashboardData.y}
                     *     } = message;)
                     * }
                     * //or (fastest performance in all possible ways to assign new values)
                     * function(message, dashboardData){
                     *     dashboardData.x = message.a.data;
                     *     dashboardData.y = message.b.data;
                     * }
                     * </code></pre>
                     * @see RosCon.listen
                     */
                    assignmentCallback.call(this, message, Dashboard.data);
                }
            });
        }
    },

    /**
     * Custom publishing method on top of ROSLIB's publish method in their Topic object. This method provides a better debugging experience and can validate the message before sending provided the means of validation are specified beforehand. This reduces unexplained situations where Ros does not acknowledge new messages sent messages due to errors in the message data from the JavaScript side as Ros does not throw error if the message data sent is not well configured.
     * @param topicName the name of the Ros topic. The topic must be saved through {@link confirmTopicExists}
     * @param messageData JavaScript object that stores values in the message. It is reminded to check whether the property <code>data</code> exists when required.
     * @return {boolean} Returns true when publishing through RosBridge is successful, but does not check whether message is accepted by ROS. Returns false if topic have not been saved via {@link confirmTopicExists} or fails validation.
     */
    publish(topicName, messageData) {
        let topic = this.getTopicByName(topicName);
        if (typeof topic === "undefined") {
            window.alert(`Topic with name "${topicName}" is not saved. Please confirm its existence by using confirmTopicExists.`);
            return false;
        }

        if (this.validationFlag) {
            //Validates message before publishing.
            let err = this.validateMessage(topicName, messageData);
            if (err) {
                this.onMessageValidationFail(messageData);
                if (this.strictValidation)
                    return false;
            }
        }

        console.log("[PUBLISH] Publishing to: " + topicName);
        topic.publish(new ROSLIB.Message(messageData));
        return true;
    },

    /**
     * Validates message before publishing. A validation instruction must be set before using this method.
     * @param topicName
     * @param messageData
     * @return {object|boolean} Returns an object containing <code>message</code> if there is an error. Otherwise, returns false.
     */
    validateMessage(topicName, messageData) {
        let exceptions = {
            propertyUndefined: (prop) =>
                `Expected well-defined property <code>${prop}</code> but is <code>undefined</code>`,
            expectedType: (expectedType, actualType) =>
                `Expected message data type <code>${expectedType}</code>, found data type <code>${actualType}</code>.`,
            expectedArrayLength: (expectedLength) =>
                `Expected message data array to have length: <code>${expectedLength}</code>, but found actual length: <code>${messageData.length}</code>.`,
            validationNotSet: () => `Validation of the message used in topic "<code>${topicName}</code>" not set.`
        };

        let validationObj = this.getValidation(topicName);
        let errMessage = "";
        let noValidation = false;

        if (typeof validationObj === "undefined") {
            console.log("[VALIDATION] Validation of the message used in topic not set.");
            noValidation = true;
            if (this.strictValidation)
                errMessage = exceptions.validationNotSet();
        }
        if (!(noValidation && this.strictValidation)) switch (validationObj.dataType) {
            case "object":
                if (typeof messageData !== "object" || Array.isArray(messageData)) {
                    errMessage = exceptions.expectedType("object", typeof messageData);
                } else {
                    validationObj.props.forEach(prop => {
                        if (typeof messageData[prop] === "undefined") {
                            errMessage = exceptions.propertyUndefined(prop);
                        }
                    });
                }
                break;
            case "array":
                if (typeof messageData !== "object" || !Array.isArray(messageData)) {
                    errMessage = exceptions.expectedType("array", typeof messageData);
                } else if (messageData.length !== validationObj.arrayLength) {
                    errMessage = exceptions.expectedArrayLength(validationObj.arrayLength);
                }
                break;
            case "int":
                if (typeof messageData.data === "number" || Math.trunc(messageData.data) !== messageData.data) {
                    errMessage = exceptions.expectedType("int", "float")
                } else {
                    errMessage = exceptions.expectedType("int", typeof messageData.data)
                }
                break;
            case "float":
                if (typeof messageData.data !== "number") {
                    errMessage = exceptions.expectedType("int", typeof messageData.data)
                }
                break;
            default:
                if (typeof messageData.data !== validationObj.dataType) {
                    errMessage = exceptions.expectedType(validationObj.dataType, typeof messageData.data);
                }
        }

        if (errMessage !== "") {
            let errMessageHTML =
                `<h5>Validation Failed</h5>
<p>${errMessage}</p>
<p>Topic Name: ${topicName}</p>
<p>Message Type: ${this.getTopicByName(topicName).messageType}</p>
<p>Failed message stored to: RosCon.validationFails[${this.validationFails.length}]</p>`;
            this.validationFails.push({
                topicName: topicName,
                messageType: this.getTopicByName(topicName).messageType,
                time: new Date(),
                testedAs: validationObj.dataType,
                content: messageData
            });
            return {message: errMessageHTML};
        }
        return false;
    },

    /**
     * Sets a validation instruction for a message type in a topic.
     *
     * @example
     * <pre>{
     *     dataType: "object", //or array, int, float, string, number, which are all accepted
     *     props: ["heading", "depth"], //properties in an object. Ignored if data type not an object
     *     arrayLength: 3, //length of array. Ignored if data type not an array
     * }</pre>
     * @param topicName
     * @param validationSettings
     * @return {*}
     */
    setValidation(topicName, validationSettings) {
        return this._validations[topicName] = validationSettings;
    },

    getValidation(topicName) {
        return this._validations[topicName];
    },

    onMessageValidationFail(message) {
        window.alert(message.message);
    },

    onConnect() {},

    onError() {},

    onClose() {}
};

/**
 * Instance of RosCon. Utility for ease of connection with ROSLIB RosBridge library.
 * @type {RosCon}
 */
let rosCon = new RosCon();