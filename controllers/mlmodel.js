const express = require("express");
const axios = require("axios").default;
const axiosRetry = require("axios-retry");
const config = require('../config.js');
const classification_svcs = require('.././services/classification.js');

const router = express.Router();

router.get("/", function (req, res) {
    console.log(req.body);
    return new Promise(function (resolve, reject) {
        if( req.body.text === null || req.body.text === undefined ) {
            reject('Pass a valid text');
            res.send('Pass a valid text')
        }
        classification_svcs.predict(req.body.text).then((payload) => {
            let beautifiedResponse = '';
            for (const annotationPayload of payload) {
                let score = annotationPayload.classification.score * 100;
                let displayName = annotationPayload.displayName;
                beautifiedResponse = beautifiedResponse + ('#### '+displayName + ' #### probability -- ' +score + ' %'+' \n');
            }
            res.send(beautifiedResponse);

        });

    }).catch(function (error) {
        console.log('Error in classification_svcs.predict ', error);
    });
});



module.exports = router;
