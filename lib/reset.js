const crypto = require("crypto");


console.log(Signture);
var host = "http://localhost:3000"
var api_key = 'UULhAxABX8e5dx1TJvp55er9lsMKjz1V2BZAdBZL';
var api_script = 'uMvKdu6xDVqJHiI4Yt5YWzrCzIX12qhhad4iFJiM';

exports.get_url = function(url, params){
    var tonce = Date.now();
    var signture = crypto.createHmac('sha256', api_key).
        update('GET|'+url+'|access_key='+api_key +params +'tonce='+tonce).digest().toString('hex');
    return host + url + '?access_key=' + api_key + params + 'tonce='+tonce + '&signature' + signture
}

var Client = require('node-rest-client').Client;
var client = new Client();
client.get("http://localhost:3000/api/v2/markets?access_key=xxx&foo=bar&tonce=123456789&signature=e324059be4491ed8e528aa7b8735af1e96547fbec96db962d51feb7bf1b64dee", function(data, response){

    console.log(response);
});