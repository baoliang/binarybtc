const crypto = require("crypto");
var urllib = require('url');
var host = "http://localhost:3000"
var api_key = 'UULhAxABX8e5dx1TJvp55er9lsMKjz1V2BZAdBZL';
var api_secret_key = 'uMvKdu6xDVqJHiI4Yt5YWzrCzIX12qhhad4iFJiM';

exports.get_url = function(url, params){
    var url_params = "";
    var tonce = Date.now();
    if (!params) {
        url_params = "&";
    }else{

        for (var key in params) {

                url_params += "&";

            url_params += key + "=" + params[key];
        }
        url_params += "&";
    }
    var signture = crypto.createHmac('sha256', api_secret_key).
        update('GET|'+url+'|access_key='+api_key +url_params +'tonce='+tonce).digest().toString('hex');
    return host + url + '?access_key=' + api_key + url_params + 'tonce='+tonce + '&signature=' + signture
}

var Client = require('node-rest-client').Client;
exports.client = new Client();
