var reset = require("./lib/reset.js");
//reset.client.get(reset.get_url('/api/v2/markets', '&foo=bar&'), function(data, response){
//    console.log(response);
//    console.log(data);
//});
reset.client.get(reset.get_url('/api/v2/members'), function(data, response){
    console.log(response);
    console.log(data);
});
