const express = require("express");
const fs = require('fs');
const axios = require("axios").default;
const axiosRetry = require("axios-retry");
const config = require('../config.js');
const gcs_svcs = require('.././services/prepDataGCS.js');

const router = express.Router();

router.get("/", function (req, res) {
  console.log(req.body);
  res.send("AutoML Training data prep service");
});

router.post("/", function (req, res) {
  console.log(req.body);
  exportBqToGCS(req.body.bqToGCS);
  res.send("AutoML Training data prep service");
});

router.post("/search", function (req, res) {
  console.log(req.body);
  //set up folders in local file system
  gcs_svcs.setupFolders(req.body.fullArchiveSearch).then((folderPath) => {
    if( folderPath != null )  {
      req.body.fullArchiveSearch.folderPath = folderPath;
      fullArchiveSearch(req.body.fullArchiveSearch);
      res.send(201, "AutoML Training Twitter Search -> Text files");
    }
  }).catch(function (error) {
    console.log('error in prepdata/search ',error)
    res.send(400, {'error':'Error creating folder'});

  })
});

async function exportBqToGCS(bqToGCS) {
  return new Promise(function (resolve, reject) {
    if (bqToGCS === null || bqToGCS.datasetId === null || bqToGCS.tableId === null) {
      reject('Check the request input params');
    }
    //var rows = gcs_svcs.extractFasToGcs(bqToGCS.datasetId, bqToGCS.tableId);
    gcs_svcs.extractFasToGcs(bqToGCS.datasetId, bqToGCS.tableId).then(() => {
      resolve('Bigquery table exported to GCS');
    })
      .catch(function (error) {
        console.log('Error in gcs_svcs.extractTableToGCS ', error);
      });
  });
}

async function fullArchiveSearch(fas, nextToken) {
  // validate requestBody before Search
  var query = { "query": fas.query, "maxResults": 500, fromDate: fas.fromDate, toDate: fas.toDate }
  if (nextToken != undefined && nextToken != null)
    query.next = nextToken;
  return new Promise(function (resolve, reject) {
    let axiosConfig = {
      method: 'post',
      url: config.fas_search_url,
      auth: {
        username: config.gnip_username,
        password: config.gnip_password
      },
      data: query
    };
    console.log('query ', JSON.stringify(query));
    axios(axiosConfig)
      .then(function (resp) {
        if (resp != null) {
          console.log('Search results');
          if (resp.data != null && resp.data.results != null && resp.data.results.length > 0) {
            // write files to local file system
            gcs_svcs.tweetsToTxt(resp.data.results, fas);
          }
          if (resp.data != undefined && resp.data.next != undefined) {
            fullArchiveSearch(fas, resp.data.next);
          }
          if (resp.data != undefined && resp.data.next === undefined) {
            if(fas.uploadToGCS === false) {
              console.log('Not uploading traning data to GCS ',fas.model);
              return;
            }
            // upload local files to GCS
            console.log('Uploading training data to GCS ',fas.model);
            gcs_svcs.uploadTraningData(config.filesytem_path + '/' + fas.model, fas.model).catch(console.error);
          }
          resolve({ "message": "Query result persisted" });
        }
      })
      .catch(function (error) {
        console.log('ERROR --- ', error);
        reject(error);
      });

  });
}

module.exports = router;
