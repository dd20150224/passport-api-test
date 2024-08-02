const dotenv = require('dotenv');
dotenv.config();


const cors = require('cors');
//require the just installed express app
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const router = require('./routes');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static("public"));
app.get('/hello', (req, res) => {
  return res.json({hello: 'hello'});
})

app.use('/', router);

app.listen(3000, () => {
    console.log("Listen on the port 3000...");
    console.log(`Using callback url: ${process.env.REDIRECT_URI}`);
});
