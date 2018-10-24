var express = require('express'),
	methodOverride = require('method-override');
  bodyParser = require('body-parser');
	restful = require('node-restful'),
	mongoose =  restful.mongoose;

var amqp = require('amqplib/callback_api');

if(process.env.VCAP_SERVICES){
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var mongourl = env.mlab[0].credentials.uri;
  var rabbiturl = env.cloudamqp[0].credentials.uri;
}
else{
  var mongourl = "mongodb://localhost/restful-prototype";
  var rabbiturl = "amqp://localhost";
}

// mongoose.connect('mongodb://localhost/restful-prototype');
mongoose.connect(mongourl);

var AuditSchema = mongoose.Schema({
  user: String,
  action: String,
  time : { type : Date, default: Date.now() }
});
var Audit = restful.model('Audit', AuditSchema);
Audit.methods(['get', 'put','post','delete']);

Audit.route('removeall', ['delete'], function(req, res, next) {
  Audit.remove({}, function (err) {
        if (err) {
          console.log(err);
        } 
    });
    res.send("records cleared!");
});

function saveAudit(msg) {
    var audit = new Audit({user:'anonymous', action: msg, time: Date.now()});
    audit.save(function (err) {
        if (err) {
          console.log(err);
        } 
        // else saved!
        return;
    });
}

amqp.connect(rabbiturl, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'audit';

    ch.assertQueue(q, {durable: false});
    ch.consume(q, function(msg) {
      console.log(" [x] Received %s", msg.content.toString());
      saveAudit(msg.content.toString());
    }, {noAck: true});
  });
});

var app = express();
var port = (process.env.PORT  || 3001);
var host = (process.env.VCAP_APP_HOST || 'localhost');
app.use(methodOverride());
// parse application/json
app.use(bodyParser.json()); 
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
//register api
Audit.register(app, '/api/audits');

app.listen(port, host);
console.log("Server is on air, port " + port);