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

    // console.log('middleware');
    next();
});

router.route("/health").get((request, response) => {
  // console.log("health check");
  response.json({ status: 200 });
});

router.route('/getsetting').get((request, response) => {

    dboperations.getSetting().then(result => {
        response.json(result[0]);
    }).catch(err => {
        console.error(err);
        response.setStatus(500);
    });

});

router.route('/updatesetting').post((request, response) => {

    let settingData = { ...request.body }
    dboperations.updateSetting(settingData).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
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

router.route('/geteventbypsnid/:personnel_id').get((request, response) => {

    dboperations.getEventByPSNId(request.params.personnel_id).then(result => {
        response.json(result);
    }).catch(err => {
        console.error(err);
        response.setStatus(500);
    });

});

router.route('/getmanagebookdata/:id').get((request, response) => {

    dboperations.getManageBookData(request.params.id).then(result => {
        response.json(result);
    }).catch(err => {
        console.error(err);
        response.setStatus(500);
    });

});

router.route('/getbookdata/:id/:month/:year').get((request, response) => {

    dboperations.getBookData(request.params.id, request.params.month, request.params.year).then(result => {
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

    let eventData = { ...request.body };

    dboperations.editEvent(eventData).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/deleteevent/:data_id/:personnel_id').delete((request, response) => {

    dboperations.deleteEvent(request.params.data_id, request.params.personnel_id).then(result => {
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

router.route('/getshiftbyid/:id').get((request, response) => {

    dboperations.getShiftById(request.params.id).then(result => {
        response.status(200).json(result[0]);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/getoperator').get((request, response) => {

    dboperations.getOperator().then(result => {
        response.status(200).json(result[0]);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/getpsneventlist/:id').get((request, response) => {

    dboperations.getPSNEventList(request.params.id).then(result => {
        response.status(200).json(result[0]);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

var port = process.env.PORT;
app.listen(port);
console.log('DMIS API is running at ' + port);