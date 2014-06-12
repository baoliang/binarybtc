// Mailserver
var nodemailer = require("nodemailer")
  , fs = require('fs')
  , crypto = require('crypto');
  

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: fs.readFileSync('mail.id'),
        pass: fs.readFileSync('mail.key')
    }
});


function sendConfirmation(to, key, cb) {
var rand = Math.random();
var shasum = crypto.createHash('sha1');
shasum.update(key);
var confirm = shasum.digest('hex');
var contents = "<b style='color:hsl(28, 99%, 46%)'>Confirm your Account</b>" +
    "<p>"+
    "To confirm your account with us, please click on the following link: <br />"+
    "<a href='https://vbit.io/confirm/"+confirm+"/'>https://vbit.io/confirm/"+confirm+"</a>"+
    "</p>";
var mailOptions = {
    from: "vBit <mail@vbit.io>",
    to: to,
    subject: "Confirm your Account",
    text: "Please visit this address to confirm your account with us: http://vbit.io/confirm/"+confirm,
    html: contents
}
smtpTransport.sendMail(mailOptions, function(err, response){
    if(err){
        throw (err);
        cb(err);
    }else{
        cb(err, responce);
    }
});
}
//sendConfirmation('liam@hogan.re', 'justme');