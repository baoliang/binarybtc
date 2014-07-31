var port = 8080
    , fs = require('fs')
    , url = require('url')
    , path = require('path')
    , http = require('http')
    , https = require('https')
    , express = require('express')
    , mongoose = require('mongoose')
    , redis = require('redis')
    , passport = require('passport')
    , async = require('async')
    , StringDecoder = require('string_decoder').StringDecoder
    , irc = require('irc')
    , authy = require('authy-node')
    , reset = require("./lib/reset.js")
    , lib =  require("./lib/lib.js");


var SALT_WORK_FACTOR = 10;

// Global clock
var date = 0;
var time = 0;
var clock = setInterval(function () {
    time = new Date().getTime();
    date = new Date();
    checknextTrade(); // Check for the next trade
    io.sockets.emit('servertime', time);
}, 1000);



// Database connect
fs.readFile('./mongo.key', 'utf8', function (err, data) {
    if (err) throw (err)
    var key = data.replace("\n", "").replace("\r", "");
    mongoose.connect(key);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback() {
        console.log('Database connected on port 27017');
    });
});

// Setup database schemas and models
var schema = new mongoose.Schema({ key: 'string', user: 'string', currency: 'string', createdAt: { type: Date, expires: '1h' }});
var Activeusers = mongoose.model('activeusers', schema);
var schema = new mongoose.Schema({ ip: 'string', time: 'string', handle: 'string' });
var Pageviews = mongoose.model('pageviews', schema);
var schema = new mongoose.Schema({ symbol: 'string', price: 'string', currency: 'string', offer: 'string', amount: 'string', direction: 'string', time: 'string', user: 'string' });
var Activetrades = mongoose.model('activetrades', schema);
var schema = new mongoose.Schema({ symbol: 'string', price: 'string', offer: 'string', currency: 'string' , amount: 'string', direction: 'string', time: 'string', user: 'string', outcome: 'string' });
var Historictrades = mongoose.model('historictrades', schema);
var schema = new mongoose.Schema({ symbol: 'string', chart: 'string'});
var Historicprices = mongoose.model('historicprices', schema);
var schema = new mongoose.Schema({ username: 'string', phone: 'string', id: 'string'});
var Userauth = mongoose.model('userauth', schema);
var schema = new mongoose.Schema({ direction: 'string', username: 'string', address: 'string', amount: 'string', status: 'string', confirmations: 'string', tx: 'string', to: 'string', time: 'string'});
var Usertx = mongoose.model('usertx', schema);


// Empty temporary database
Pageviews.remove({}, function (err) {
    if (err) console.log(err);
});

// Key value connect and money handling
fs.readFile('./redis.key', 'utf8', function (err, data) {
    if (err) throw (err);
    var key = data.replace("\n", "").replace("\r", "");
    var options = {
        auth_pass: key
    }
    rclient = redis.createClient(null, null, options);
});

function pay(amount, tradeuser) {
   console.log("amount=" + amount + "user = " + tradeuser)
}

function collectbank(amount, tradeuser, cb) {
    amount = round(amount, 6);
    rclient.get(tradeuser, function (err, reply) {
        if (err) throw (err)
        var updatedbal = round(+reply - amount, 6);
        rclient.set(tradeuser, updatedbal, function (err, reply) {
            if (err) throw (err)
            rclient.get('myaccount', function (err, reply) {
                if (err) throw (err)
                var updatedbal = round(+reply + amount, 6);
                rclient.set('myaccount', updatedbal, function (err, reply) {
                    if (err) throw (err)
                    cb(reply);
                });
            });
        });
    });
}

// 2 Factor
fs.readFile('./authy.key', 'utf8', function (err, data) {
    if (err) throw (err)
    var key = data.replace("\n", "").replace("\r", "");
    authy.api.mode = 'production'
    authy.api.token = key;
});


// Webserver

// Include SSL server.key and domain.crt from a safe place
var ca, file, files, fs, https, httpsOptions, httpsServer, requestHandler;


// Start secure webserver
//var keys = new Keygrip(["SEKRIT2", "SEKRIT1"]);
var app = module.exports = express();
app.configure(function () {
    app.use(express.static('public'));
    app.use(app.router);
    app.use(express.cookieParser('SEKRIT1'));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.bodyParser());
});
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
// Create the server object
var server = http.createServer(app).listen(port, function () {
    console.log("Express server listening on port " + port);
});

// Start secure socket server
var io = require('socket.io')(server);
io.set('log level', 1); // reduce logging
console.log("start io")
// User Middleware
var User = require('./lib/user-model.js');


// Tradeserver Variables
//Bitcoin and Crypto
var symbols = ['BTCUSD', 'LTCUSD', 'EURUSD', 'GBPUSD', 'CADUSD', 'AAPL', 'GOOG', 'CLM14.NYM', '^SLVSY'];

var bank;
var put = 0;
var call = 0;
var maxamount = 20000000; // the max amount a user can set for any one trade
var maxoffset = { bottom: 75, top: 25 };
var cuttrading = 0; // seconds before trading where the user is locked out from adding a trade (zero to disable)
var offer = 0.99;
var tradeevery = 5; // Defaut time in minutes before trading again
var userNumber = 1;
var userbalance = new Array();

var trades = new Array();
var signupsopen = true; // Allow signups?
var tradingopen = true; // Allow trading? -proto
var diff = {};
var users = {};
var price = {};
var ratio = {};
var balance = {};
var calls = {};
var puts = {};
var totalcall = {};
var totalput = {};
var y = new Array();
var x = new Array();
var z = new Array();
var a = 0;
var processedtrades = new Array();




// Master trade function
//=trade
function trade() {
    var index;//Loop the trades
    var processedtrades = new Array();
    for (index = 0; index < trades.length; ++index) {
        var entry = trades[index]; ///example data
        var tradesymbol = entry[0]; //BTCUSD
        var tradeprice = entry[1]; //600
        var offer = entry[2]; //0.75
        var amount = entry[3];//5
        var direction = entry[4]; //Call
        var tradetime = entry[5]; //1393712774917
        var tradeuser = entry[6]; //Guest123
        var currency = entry[7]; //Guest123
        var outcome = null; //Win
        var winnings = 0;//7

        // Check the direction and calculate the outcome
        if (direction == 'Put') {
            if (tradeprice > price[tradesymbol]) {
                winnings = (+amount + (amount * offer));
                outcome = 'Win';
                //Update user balance and move winnings out of the bank
                pay(winnings, tradeuser);
            } else if (tradeprice < price[tradesymbol]) {
                outcome = 'Lose';//Lose
                // User lost put
            } else if (tradeprice == price[tradesymbol]) {
                outcome = 'Tie';
                pay(amount, tradeuser);
            }
        } else if (direction == 'Call') {
            if (tradeprice < price[tradesymbol]) {
                outcome = 'Win';
                winnings = (amount + (amount * offer));
                pay(winnings, tradeuser, function (outcome) {

                });
            } else if (tradeprice > price[tradesymbol]) {
                outcome = 'Lose';//Lose
                // User loses call
            } else if (tradeprice == price[tradesymbol]) {
                outcome = 'Tie';
                pay(amount, tradeuser);
            }
        }

        //console.log(tradeuser + ' ' + outcome + ' ' + amount);

        // Store the processed trades in the db
        var dbhistorictrades = new Historictrades({
            symbol: tradesymbol,
            price: tradeprice,
            offer: offer,
            amount: amount,
            direction: direction,
            time: time,
            currency: currency,
            user: tradeuser,
            outcome: outcome
        });
        dbhistorictrades.save(function (err) {
            if (err) console.log(err)
            // and in the ram

        });
        processedtrades.push({
            symbol: tradesymbol,
            price: tradeprice,
            offer: offer,
            amount: amount,
            direction: direction,
            time: time,
            user: tradeuser,
            outcome: outcome
        });
        ratio[tradesymbol] = 50;
    }//foreach trade
    processTrade(processedtrades);

    // empty the ram and database of old objects
    x = new Array(); //win
    y = new Array(); //tie
    z = new Array(); //lose
    t = new Array(); //totals
    calls = {};
    puts = {};
    totalcall = {};
    totalput = {};
    trades = new Array();
    Activetrades.remove({}, function (err) {
        if (err) console.log(err);
    });



}


// Add a trade for a user
function addTrade(symbol, amount, direction, user, socket, currency) {
    var err = {};
    symbol = symbolswitch(symbol);

    // Check the amount
    if (amount > 0) {
        // Check the direction and make sure price[symbol] exists
        if (direction == 'Call' || direction == 'Put' && price[symbol]) {
            // Put the amount info a number
            amount = Number(amount);
            // Check if the amount is over maxamount
            if (amount <= maxamount) {
                // Check if the amount is over the user balance
                if (userbalance[user] >= amount) {
                    console.log(ratio);
                    if(!ratio[symbol]){
                        ratio[symbol] = 0;
                    }
                    if (direction == 'Call' && ratio[symbol] > maxoffset.bottom) {
                        // The direction is invalid
                        err.sym = symbol;
                        err.msg = 'Call';
                        socket.emit('tradeerror', err);
                        return false;
                    } else if (direction == 'Put' && ratio[symbol] < maxoffset.top) {
                        // The direction is invalid
                        err.sym = symbol;
                        err.msg = 'Put';
                        socket.emit('tradeerror', err);
                        return false;
                    } else {
                        var now = time;

                        // Move the users funds to the bank
                        collectbank(amount, user, function () {

                            // Adjust the totals
                            if (direction == 'Call') {
                                if (calls[symbol]) {
                                    calls[symbol]++;
                                } else {
                                    calls[symbol] = 1
                                }
                                if (totalcall.symbol) {
                                    var totalcallsi = Number(totalcall.symbol) + Number(amount);
                                } else {
                                    var totalcallsi = Number(amount);
                                }
                                totalcall = { symbol: totalcallsi };
                            }
                            if (direction == 'Put') {
                                if (puts[symbol]) {
                                    puts[symbol]++;
                                } else {
                                    puts[symbol] = 1
                                }
                                if (totalput.symbol) {
                                    var totalputsi = Number(totalput.symbol) + Number(amount);
                                } else {
                                    var totalputsi = Number(amount);
                                }
                                totalput = { symbol: totalputsi };
                            }
                            if (!totalcall.symbol) {
                                totalcall.symbol = 0;
                            }
                            if (!totalput.symbol) {
                                totalput.symbol = 0;
                            }

                            if (totalcall.symbol > totalput.symbol) diff[symbol] = (totalcall.symbol - totalput.symbol);
                            if (totalcall.symbol < totalput.symbol) diff[symbol] = (totalput.symbol - totalcall.symbol);
                            if (totalcall.symbol == totalput.symbol) diff[symbol] = 0;

                            // Add the two sides to make a total
                            var t = Number(totalcall.symbol) + Number(totalput.symbol);

                            // Create a ratio percentage
                            ratio[symbol] = round(Number(totalcall.symbol) / Number(t) * 100);
                            console.log(symbol, ratio[symbol])

                            // Insert the trade into the database
                            var dbactivetrades = new Activetrades({
                                symbol: symbol,
                                price: price[symbol],
                                offer: offer,
                                amount: amount,
                                direction: direction,
                                time: now,
                                currency: currency,
                                user: user
                            });
                            // Get the user's bitcoin address and balance
                            reset.client.get(reset.get_url("/api/v2/members/lock", {uid: user, currency: currency, amount: amount}), function(data, response){
                                if(data.ok){
                                    dbactivetrades.save(function (err) {
                                        if (err) throw (err);
                                        // Announe the trade
                                        console.log('New trade:' + user + ':' + symbol + ':' + direction + ':' + amount);

                                        var tradeinit = new Array();
                                        tradeinit[0] = symbol;
                                        tradeinit[1] = price[symbol];
                                        tradeinit[2] = offer;
                                        tradeinit[3] = amount;
                                        tradeinit[4] = direction;
                                        tradeinit[5] = now;
                                        tradeinit[6] = user;
                                        tradeinit[7] = currency;
                                        trades.push(tradeinit);
                                        socket.emit('ratios', ratio);
                                        socket.emit('tradeadded', symbol);
                                        socket.emit('activetrades', trades);
                                        a++;
                                        return true;
                                    });
                                }

                            });

                        });
                    }

                } else {
                    // The amount is larger than the user's balance
                    err.sym = symbol;
                    err.msg = 'Balance';
                    socket.emit('tradeerror', err);
                    return false;
                } // err
            } else {
                // The amount is over the max ammount
                err.sym = symbol;
                err.msg = 'Max Amount';
                socket.emit('tradeerror', err);
                return false;
            }
        } else {
            // The direction is invalid
            err.sym = symbol;
            err.msg = 'Pick';
            socket.emit('tradeerror', err);
            return false;
        }
    } else {
        // The amount is not over zero
        err.sym = symbol;
        err.msg = 'Pick';
        socket.emit('tradeerror', err);
        return false;
    }
}

var nexttrade = new Array();
var nexttradesecs = tradeevery * 60;
// Calculate the next trade
function checknextTrade() {
    // Get minutes in the global date object [10:01:02AM]
    var mins = date.getMinutes(); // [01]
    mins = (59 - mins) % tradeevery; // Trade every % ten minutes
    // Get seconds
    var secs = date.getSeconds(); // [02]
    if (secs != 60) {
        secs = (59 - secs) % 60;
    } else {
        secs = 00;
    }
    nexttrade = [Number(mins), Number(secs)];  // Put the next trade in an array [8:58]
    nexttradesecs = (mins * 60) + secs;
    //console.log(nexttradesecs);
    io.sockets.emit('nexttrade', nexttrade); // Emit to chrome
    //console.log(mins+':'+secs);
    // If it's time to trade
    if (nexttrade[0] == 0 && nexttrade[1] == 0) {
        trade();
    }
}


function getUsers() {
    var userNames = [];
    for (var name in users) {
        if (users[name]) {
            userNames.push(name);
        }
    }
    return userNames;
}


// price and chart updaters

var i = 0;
var lastentry, firstentry, timewindow, chartsymbol, lastprice;
var chartdata = [];
var chart = {};

// Fill the ram with chart data on boot
Historicprices.find({}, function (err, docs) {
    if (err) throw (err)
    for (var i = 0; i < docs.length; i++) {
        docs = docs[i];
        io.sockets.emit(docs.symbol, docs.chart);
        if (chart[docs.symbol]) {
            chartdata = chart[docs.symbol];
        } else {
            chartdata = [];
        }
        cartdata = docs.chart;
        chart[docs.symbol] = chartdata;
        console.log(docs.symbol);
    }
});
function valuesToArray(obj) {
    return Object.keys(obj).map(function (key) {
        return obj[key];
    });
}

function updatePrice(data, force, symbol) {
    // if (lastprice != data) {
    io.sockets.emit(symbol + '_price', data);
    updateChart(data, symbol);
    chartPoint(data, symbol);
    // }
}
chartdata = [];
function updateChart(data, symbol, force) {
    //if (data != lastchart || force) {
    chartsymbol = symbol + '_chart';

    if (Number(data)) {
        if (chart[symbol]) {
            chartdata = chart[symbol];
        } else {
            chartdata = [];
        }
        chartentry = new Array(time, Number(data));
        chartdata.push(chartentry);
        chart[symbol] = chartdata;
//          console.log('Charting '+symbol+' : '+chart[symbol]);
        io.sockets.emit(chartsymbol, chart[symbol]);

        var query = { symbol: symbol };
        Historicprices.findOneAndUpdate(query,
            { symbol: symbol, chart: chart[symbol] },
            { upsert: true}
            , function (err) { // save or update chart data
                if (err) throw (err)
            });

        lastchart = data;
        if (i == 0) {
            firstentry = time;
            lastentry = time;
        } else {
            lastentry = time;
        }
        i++;
        timewindow = lastentry - firstentry;
        if (timewindow > 1800000) {
            i--;
            chartdata.shift();
        }
    }
    //}
}

// Emit a single updated chart point for the client
function chartPoint(data, symbol) {
    chartsymbol = symbol + '_updatedchart';
    if (Number(data)) {
        chartentry[symbol] = [time, Number(data)];
        io.sockets.emit(chartsymbol, chartentry[symbol]);
        //console.log(chartsymbol + ':' + chartentry[symbol]);
    }
}


var lag = 0;


var tradeupdater = setInterval(function () {
    var symbols = ['BTCUSD', 'LTC/USD', 'EURUSD', 'GBPUSD', 'CADUSD'];

    async.each(symbols, function (symbol, callback) {
        getPrice(symbol, 1);
    }, function (err) {
        if (err) throw(err);
    });

}, 2753);


User.count({ }, function (err, count) {
    if (err) throw(err);
    userNumber = (userNumber + count);
});

// Fill the ram with active trades from the database
Activetrades.find({ }, function (err, data) {
    if (err) throw (err)
    for (var i = 0; i < data.length; i++) {
        var trade = data[i];
        var tradeinit = new Array();
        tradeinit[0] = trade.symbol;
        tradeinit[1] = trade.price;
        tradeinit[2] = trade.offer;
        tradeinit[3] = trade.amount;
        tradeinit[4] = trade.direction;
        tradeinit[5] = trade.now;
        tradeinit[6] = trade.user;
        tradeinit[7] =  trade.currency;
        trades.push(tradeinit);
    }
    io.sockets.emit('activetrades', trades);
});

// Socketeering
//=socks
var myName, myNumber;
// User Connects
io.sockets.on('connection', function (socket) {
    var hs = socket.handshake;
    var ipaddress = hs.address; //ipaddress.address/ipaddress.port
    ipaddress = ipaddress.address;

    for (index = 0; index < symbols.length; ++index) {
        io.sockets.emit(symbols[index] + '_price', price[symbols[index]]);
        io.sockets.emit(symbols[index] + '_chart', chart[symbols[index]]);
    }

    io.sockets.emit('symbols', symbols);
    var userpage = new Array();
    var useraddress = new Array();
    var dualFactor = new Array();
    var dualFactorid = new Array();
    var email = new Array();
    var userxp = new Array();
    var userratio = new Array();
    var userpercentage = new Array();
    var userlevel = new Array();
    var userwins = new Array();
    var userlosses = new Array();
    var userties = new Array();
    io.sockets.emit('tradingopen', tradingopen); // Update trading status

    socket.on('page', function (data) {
        userpage[myName] = data.page;
        console.log(data);
        socket.emit('loadpage', {page: data.page, symbol: data.symbol, guest: data.guest});
    });

    // Check the users cookie key
    checkcookie(socket, function (myName, isloggedin, currency) {
        console.log("my name is" + myName);
        // isloggedin = true/false
        // Everything inside
        // Get the user's balance
        rclient.get(myName, function (err, reply) {
            if (reply && reply != null && reply != 'NaN') {
                userbalance[myName] = reply;
            } else {
                userbalance[myName] = 0;
            }
        });

        // Assign them a number
        myNumber = userNumber++;
        if (!myName) {
            myName = 'Guest' + myNumber;
        }
        // Assign them a socket
        users[myName] = socket;

        // Say hello
        console.log('hello ' + myName + ' id' + myNumber)
        userxp[myName] = 0;
        userratio[myName] = 0;
        userpercentage[myName] = 0;
        userlevel[myName] = 0;
        userwins[myName] = 0;
        userlosses[myName] = 0;
        userties[myName] = 0;
        var rtotal = 0;

        Historictrades.find({ user: myName }, function (err, docs) {
            if (err) throw (err)
            for (var i; docs.length > i; i++) {
                doc = docs[i];
                if (doc.outcome == 'Win') {
                    userxp[myName] = (+userxp[myName] + 20);
                    userwins[myName]++;
                }
                if (doc.outcome == 'Tie') {
                    userxp[myName] = (+userxp[myName] + 10);
                    userties[myName]++;
                }
                if (doc.outcome == 'Lose') {
                    userxp[myName] = (+userxp[myName] + 0);
                    userlosses[myName]++;
                }
            }

            rtotal = (+userlosses[myName] + userwins[myName] + userties[myName]);
            userpercentage[myName] = round(Number(userwins[myName]) / Number(rtotal) * 100);
            userratio[myName] = userwins[myName] + ':' + userlosses[myName];

            userlevel[myName] = 0;

        });



        socket.emit('hello', { hello: myName, id: "", email: "", verified: false, dualfactor: false, ratio: userratio[myName], percentage: userpercentage[myName], xp: userxp[myName], level: userlevel[myName] });


        socket.emit('userbal', { name: myName, balance: userbalance[myName] }); // Update userbalance
        //Send user current data on connect

        Historictrades.find({ user: myName }).sort({time: -1}).find(function (err, historictrades) {
            socket.emit('historictrades', historictrades);
        });


        // Emit any active trades on pageload
        if (trades) {
            socket.emit('activetrades', trades);
        }

        // Pass new trade details from the socket to addTrade
        socket.on('trade', function (data) {
            if (data.user == myName) {
                // Check if input data is valid
                var re = new RegExp(/[\s\[\]\(\)=,"\/\?@\:\;]/g);
                console.log("add trade");
                if (re.test(data.amount)) {
                    console.log('Illegal trade input from ' + myName);
                } else {
                    // Push data to addTrade
                    //console.log('add trade for ' + data.user);
                    addTrade(data.symbol, data.amount, data.direction, data.user, socket, currency);
                    // Emit active trades again
                    socket.emit('activetrades', trades);
                }
            }
        });

        // Proto action socket listener
        socket.on('action', function (data) {
            console.log('action: ' + data);
        });

        //})

        // Create a general script updater
        var updater = setInterval(function () {
            socket.emit('userbal', { name: myName, balance: userbalance[myName] }); // Update userbalance
            socket.emit('username', myName); // Update userbalance
            if (trades) socket.emit('activetrades', trades); // Update active trades
            Historictrades.find({ user: myName }).sort({time: -1}).find(function (err, historictrades) {
                socket.emit('historictrades', historictrades);
            });
            io.sockets.emit('tradingopen', tradingopen); // Update trading status
            socket.emit('ratios', ratio); // Update ratios
            io.sockets.emit('listing', getUsers()); // Update user listing
            // Balance updater

            // Get the user's bitcoin address and balance
            reset.client.get(reset.get_url("/api/v2/members/balance", {uid: myName, currency: currency}), function(data, response){
                socket.emit('logins', "");
                console.log(data);

                userbalance[myName] = data.balance;

                socket.emit('wallet', {address: "", balance: data.balance}); // Update useraddress
            });



        }, 1050); // Run every second




        // Emit trade objects
        io.sockets.emit('totalcall', call);
        io.sockets.emit('totalput', put);
        //io.sockets.emit('option', symbol);
        io.sockets.emit('offer', offer);
        (function(){
            var host = "localhost";
            var name = myName;
            var irclient = new irc.Client(host, name, {
                channels: ['#deetz']
            });

            socket.on('chat', function (message) {
                socket.broadcast.emit('chat', {from: myName, message: message});
            });
            socket.on('message', function (data) {
                socket.broadcast.emit('chat', {from: myName, message: message});

            });

        })();
        // Protochat



        // User disconnects
        socket.on('disconnect', function () {
            console.log(myName + ' disconnected');
            //users[myName] = null;
            //userbalance[myName] = null;
            // if (guest == true) {
            //   Historictrades.remove({ user: myNumber }, function (err) {
            //   if (err) throw(err);
            //   });
            // }
            clearInterval(updater);
            //if (slowupdater) clearInterval(slowupdater);
            io.sockets.emit('listing', getUsers());
        });


   }); // Cookies


});

// Express webservice

// Use the Views directory
app.use('/', express.static(__dirname + '/views'));
// Send index
app.get('/', function (req, res) {
    console.log("xx="+req.query)
    res.render('index', {
        user: true,
        col: 2,
        currency:req.query.currency,
        email: req.query.email
    });

});
app.get('/signupsopen', function(req, res, next){
    if (signupsopen == true) {
        res.send('OK');
    } else {
        res.send('NO');
    }
});
app.get('/btcstatus', function (req, res, next) {
    loginfo();
});



// Proto
app.get('/nexttrade', function (req, res, next) {
    res.send(nexttrade[0] + ':' + nexttrade[1]);
});
app.get('/tradeevery', function (req, res, next) {
    res.send(tradeevery);
});
app.get('/secs', function (req, res, next) {
    res.send(nexttradesecs);
});
app.get('/progress', function (req, res, next) {
    var secs = ((+nexttrade[0] * 60) + nexttrade[1]);
    var every = (+tradeevery * 60);
    var progress = ((+tradeevery / secs) * 10);
    res.send(progress);
});




app.get('/peatio/:uid/:token/:lang/:currency', function (req, res) {
    var token = req.param('token', null);
    var uid = req.param('uid', null);
    var lang = req.param('lang', null);
    var currency = req.param('currency', null);
    reset.client.get(reset.get_url("/api/v2/members/auth", {uid: uid, token:token, currency: currency}), function(data, response){
        // parsed response body as js object
        console.log(data);
        // raw response

        if (data.ok == true){
            console.log("login is true");
            var signature = lib.randomString(32, 'HowQuicklyDaftJumpingZebrasVex');
            // Add it into a secured cookie
            res.cookie('key', signature, { maxAge: 3600000000, path: '/', secure: false });
            // Add the username and signature to the database
            var userKey = new Activeusers({
                key: signature,
                user: uid,
                lang: lang,
                currency:  currency,
                createdAt: date,
                email: data.email
            });
            userKey.save(function (err) {
                console.log(err)
                if (err) {
                    throw (err);
                    console.log(err)
                }
            });
            console.log("save " + userKey);
            res.redirect("/?currency="+currency+"&email="+data.email);
        }else{
            res.redirect("/403")
        }

    });

})



// Load subpages
app.get('/account/', function (req, res, next) {
    //res.send(req.params.id);
    res.sendfile('views/a.html');
});
app.get('/finance/', function (req, res, next) {
    //res.send(req.params.id);
    res.sendfile('views/f.html');
});

// function wasteland */

function checkcookie(socket, next) {

    var result = null;
    //Parse existing cookies
    console.log("start check")
    console.log(socket.handshake);

    if (socket.handshake.headers.cookie) {
        var cookie = socket.handshake.headers.cookie;
        var cookieObj = {};
        var cookieArr = cookie.replace(" ","").split(';');

        console.log(cookieArr);
        for (index = 0; index < cookieArr.length; ++index) {
            var cookieKV = cookieArr[index];
            cookieKV = cookieKV.trim();
            var cookieKVArr = cookieKV.split('=');
            cookieObj[cookieKVArr[0]] = cookieKVArr[1];
            console.log("key is " + cookieObj.key);
        }
        console.log(cookieObj);
        if (cookieObj.key) {

            Activeusers.find({ key: cookieObj.key }, function (err, docs) {
                if (err) {
                    throw (err)
                } else {
                    docs = docs[0];
                    // User authorized
                    if (docs) {
                        console.log(docs.user + ":" + docs.key);
                        next(docs.user, true, docs.currency);
                        //console.log(myName+':'+myNumber+' connected');
                        // Log the connection
                        var pageload = new Pageviews({
                            ip: socket.handshake.address.address,
                            time: time,
                            handle: myName
                        });
                        pageload.save(function (err) {
                            if (err) throw (err);
                        });
                    } else {
                        next('Guest', false);
                    }
                }
            });
        }
    } // if cookie
}




function round(num, places) {
    if (!places) places = 0;
    var multiplier = Math.pow(10, places);
    return Math.round(num * multiplier) / multiplier;
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function symbolswitch(symbol) {
    // switch out illigal characters
    switch (symbol) {
        case 'DOW':
            symbol = '^DJI'
            break;
        case 'OIL':
            symbol = 'CLM14.NYM'
            break;
        case 'GOLD':
            symbol = 'GCM14.CMX'
            break;
        case 'SP500':
            symbol = '^GSPC'
            break;
        case 'NASDAQ':
            symbol = '^IXIC'
            break;
        case 'SILVER':
            symbol = '^SLVSY'
            break;
    }
    return symbol;
}

function processTrade(trades) {
    console.log('Processed trades ' + date.toString());
    //console.log(trades);

    var processedu = new Array();
    for (var index = 0; index < trades.length; ++index) {
        var trade = trades[index];
        //console.log(trade.user)
        if (!x[trade.user]) x[trade.user] = 0;
        if (!y[trade.user]) y[trade.user] = 0;
        if (!z[trade.user]) z[trade.user] = 0;

        if (trade.outcome == 'Win') x[trade.user] = (+x[trade.user] + (+trade.amount + (trade.amount * trade.offer)));
        if (trade.outcome == 'Tie') y[trade.user] = (+y[trade.user] + trade.amount);
        if (trade.outcome == 'Lose') z[trade.user] = (+z[trade.user] + trade.amount);

    }
    console.log(processedu);
    for (var index = 0; index < processedu.length; ++index) {
        var user = processedu[index];

        console.log('Trade outcome for ' + user + ' Won:' + x[user] + ' Tied:' + y[user] + ' Lost:' + z[user]);
    }
}


//get 价格

var chartdata = new Array();
var lag = 0;
function getPrice(symbol, force, callback) {
    var err = 0;
    var data = null;

    if (symbol == 'BTCUSD') {
        var symb = symbol.match(/.{3}/g);
        var symb = symbol.toLowerCase();
        symb = symb[0];
        var options = {
            host: 'btc-e.com',
            port: 443,
            path: '/api/2/btc_usd/ticker'
        };
        https.get(options, function (resp) {
            var decoder = new StringDecoder('utf8');
            resp.on('data', function (chunk) {
                chunk = decoder.write(chunk);
                //console.log(chunk)
                var data = chunk.split(',');
                console.log(data);
                var datas = data[7].split(':');
                data = datas[1];

                if (isNumber(data)) {
                    data = Number(data);
                    data.toFixed(2);
                    //console.log(data);
                    updatePrice(data, force, symbol);
                    price[symbol] = data;
                } else {
                    lag = lag + 2;
                }
            });
        }).on("error", function (e) {
            console.log("Got " + options.host + " error: " + e.message);
        }); // if symbol is a currency, we run it through for the exchange rate
    } else if (symbol == 'LTCUSD') { // || symbol == 'NMCUSD' || symbol == 'NVCUSD' || symbol == 'NVCUSD'
        var symb = symbol.match(/.{3}/g);
        var symb = symbol.toLowerCase();
        symb = symb[0];
        var options = {
            host: 'btc-e.com',
            port: 443,
            path: '/api/2/ltc_usd/ticker'
        };
        https.get(options, function (resp) {
            var decoder = new StringDecoder('utf8');
            resp.on('data', function (chunk) {
                chunk = decoder.write(chunk);
                // console.log(chunk)
                var data = chunk.split(',');
                var datas = data[7].split(':');
                data = datas[1];

                if (isNumber(data)) {
                    data = Number(data);
                    data.toFixed(2);
                    //console.log(data);
                    updatePrice(data, force, symbol);
                    price[symbol] = data;
                } else {
                    lag = lag + 2;
                }
            });
        }).on("error", function (e) {
            console.log("Got " + options.host + " error: " + e.message);
        }); // if symbol is a currency, we run it through for the exchange rate
    } else if (symbol == 'EURUSD' || symbol == 'GBPUSD' || symbol == 'CADUSD') {
        var options = {
            host: 'download.finance.yahoo.com',
            port: 80,
            path: '/d/quotes.csv?s=' + symbol + '=X&f=sl1d1t1c1ohgv&e=.csv'
        };
        http.get(options, function (resp) {
            var decoder = new StringDecoder('utf8');
            resp.on('data', function (chunk) {
                chunk = decoder.write(chunk);
                data = chunk.split(',');
                data = data[1];
                //console.log(symbol+':'+data);
                if (isNumber(data)) { // is this data even numeric?
                    //console.log(symbol+':'+data);
                    updatePrice(data, force, symbol);
                    price[symbol] = data;
                } else {
                    lag = lag + 2;
                }
            });
        }).on("error", function (e) {
            console.log("Got " + options.host + " error: " + e.message);
            err++;
        });
        // if symbol is a stock, run it through for the price
    } else {
        var options = {
            host: 'download.finance.yahoo.com',
            port: 80,
            path: '/d/quotes.csv?s=' + symbol + '&f=sl1d1t1c1ohgv&e=.csv'
        };
        http.get(options, function (resp) {
            var decoder = new StringDecoder('utf8');
            resp.on('data', function (chunk) {
                chunk = decoder.write(chunk);
                data = chunk.split(',');
                data = data[1];
                //console.log(symbol, data);
                if (isNumber(data)) { // is this data even numeric?
                    updatePrice(data, force, symbol);
                    price[symbol] = data;
                } else {
                    lag = lag + 5;
                }
            });
        }).on("error", function (e) {
            console.log("Got " + options.host + " error: " + e.message);
            err++;
        });
    }// jump over third-party gates
}






