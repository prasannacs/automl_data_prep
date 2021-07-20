const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors')
const prepData = require('./controllers/prepdata')
const mlModel = require('./controllers/mlmodel')

const app = express();
const port = process.env.PORT || 4090;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
app.options('*', cors()) 
app.post('*', cors()) 
app.use('/prepdata',prepData);
app.use('/mlmodel',mlModel);

app.listen(port, ()=>   {
    console.log("App listening on port",port)
})