const dboperations = require('./dboperations');

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const { request, response } = require('express');
var app = express();
var router = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    origin: '*'
}));
app.use('/api/dsms', router);

router.use((request, response, next) => {
    //write authen here

    response.setHeader('Access-Control-Allow-Origin', '*'); //หรือใส่แค่เฉพาะ domain ที่ต้องการได้
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Credentials', true);

    console.log('middleware');
    next();
});

router.route('/getsetting').get((request, response) => {

    dboperations.getSetting().then(result => {
        response.json(result[0]);
    }).catch(err => {
        console.error(err);
        response.setStatus(500);
    });
    
});

router.route('/getevent').get((request, response) => {

    dboperations.getEvent().then(result => {
        response.json(result);
    }).catch(err => {
        console.error(err);
        response.setStatus(500);
    });
    
});

router.route('/getbookdata/:id/:month').get((request, response) => {

    dboperations.getBookData(request.params.id, request.params.month).then(result => {
        response.json(result);
    }).catch(err => {
        console.error(err);
        response.setStatus(500);
    });
    
});

router.route('/addevent').post((request, response) => {

    let eventData = { ...request.body };
    dboperations.addEvent(eventData).then(result => {
        response.status(201).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/editevent').post((request, response) => {

    let eventData = { ...request.body};

    dboperations.editEvent(eventData).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });
    
});

router.route('/deleteevent/:id/:personnel_id').delete((request, response) => {

    dboperations.deleteEvent(request.params.id, request.params.personnel_id).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/getshift').get((request, response) => {

    dboperations.getShift().then(result => {
        response.status(200).json(result[0]);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

var port = process.env.PORT;
app.listen(port);
console.log('DMIS API is running at ' + port);