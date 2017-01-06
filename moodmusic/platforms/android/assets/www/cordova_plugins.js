cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "id": "cordova-plugin-inappbrowser.inappbrowser",
        "file": "plugins/cordova-plugin-inappbrowser/www/inappbrowser.js",
        "pluginId": "cordova-plugin-inappbrowser",
        "clobbers": [
            "cordova.InAppBrowser.open",
            "window.open"
        ]
    },
    {
        "id": "com.phonegap.plugins.facebookconnect.FacebookConnectPlugin",
        "file": "plugins/com.phonegap.plugins.facebookconnect/facebookConnectPlugin.js",
        "pluginId": "com.phonegap.plugins.facebookconnect",
        "clobbers": [
            "facebookConnectPlugin"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-whitelist": "1.3.1",
    "cordova-plugin-inappbrowser": "1.6.1",
    "com.phonegap.plugins.facebookconnect": "0.11.0"
};
// BOTTOM OF METADATA
});