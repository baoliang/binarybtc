const crypto = require("crypto");
var urllib = require('url');
var host = "http://localhost:3000"
var api_key = 'UULhAxABX8e5dx1TJvp55er9lsMKjz1V2BZAdBZL';
var api_secret_key = 'uMvKdu6xDVqJHiI4Yt5YWzrCzIX12qhhad4iFJiM';

exports.get_url = function(url, params){
    var url_params = "";
    var tonce = Date.now();
    if (!params) {
        url_params = "";
    }else{
        url_params = "&params=" + JSON.stringify(params);
    }
    var signture = crypto.createHmac('sha256', api_secret_key).
        update('GET|'+url+'|access_key='+api_key  +'&tonce='+tonce + url_params).digest().toString('hex');
    console.log(host + url + '?access_key=' + api_key  + '&tonce='+tonce + '&signature=' + signture +url_params);
    return host + url + '?access_key=' + api_key  + '&tonce='+tonce + '&signature=' + signture  +url_params
}

var Client = require('node-rest-client').Client;
exports.client = new Client();
