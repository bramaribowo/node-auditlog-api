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

amqp.connect(rabbiturl, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'audit';

    ch.assertQueue(q, {durable: false});
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
    ch.consume(q, function(msg) {
      console.log(" [x] Received %s", msg.content.toString());
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
// mongoose.connect('mongodb://localhost/restful-prototype');
mongoose.connect(mongourl);

var AuditSchema = mongoose.Schema({
	user: String,
	action: String,
	time : { type : Date, default: Date.now }
});
var Audits = restful.model('audits', AuditSchema);
Audits.methods(['get', 'put','post','delete']);
Audits.register(app, '/api/audits');

app.listen(port, host);
console.log("Server is on air, port 3001");