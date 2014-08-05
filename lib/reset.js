const crypto = require('crypto');
var host = "http://coinexc.org"
var api_key = 'UULhAxABX8e5dx1TJvp55er9lsMKjz1V2BZAdBZL';
var api_secret_key = 'uMvKdu6xDVqJHiI4Yt5YWzrCzIX12qhhad4iFJiM';

exports.get_url = function(url, params){
    var url_params = "";
    var tonce = Date.now();
    if (params) {
        for (var key in params) {

            url_params += "&";

            url_params += key + "=" + params[key];
        }

    }


    var signture = crypto.createHmac('sha256', api_secret_key).update('GET|'+url+'|access_key='+api_key  +'&tonce='+tonce + url_params).digest().toString('hex');
    console.log(signture);
    return host + url + '?access_key=' + api_key  + '&tonce='+tonce + '&signature=' + signture  +url_params
}

var Client = require('node-rest-client').Client;
exports.client = new Client();
