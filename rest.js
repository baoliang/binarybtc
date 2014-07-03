const crypto = require("crypto");

Signture = crypto.createHmac('sha256', 'yyy').
    update('GET|/api/v2/markets|access_key=xxx&foo=bar&tonce=123456789').digest().toString('hex');
console.log(Signture);
var Client = require('node-rest-client').Client;

client = new Client();
client.get("http://localhost:3000/api/v2/markets?access_key=xxx&foo=bar&tonce=123456789&signature=e324059be4491ed8e528aa7b8735af1e96547fbec96db962d51feb7bf1b64dee", function(data, response){
    // parsed response body as js object

    console.log(response);
});