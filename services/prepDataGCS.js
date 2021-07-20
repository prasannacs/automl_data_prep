const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const config = require('../config.js');
const fs = require('fs')
const utils = require('./utils');
const e = require('express');
const { resolve } = require('path');
const archiver = require('archiver');

const bigqueryClient = new BigQuery();
const storage = new Storage();

async function tweetsToTxt(tweets, fas) {
  tweets.forEach(function (tweet, index) {
    let text;
    if (tweet.extended_tweet != undefined && tweet.extended_tweet != null)
      text = tweet.extended_tweet.full_text
    else
      text = tweet.text;
    //console.log('Tweet Id ', tweet.id_str, ' text ' + text);
    writeTweets(fas, text, tweet.id_str);
  });
}

async function setupFolders(fas) {
  return new Promise(function (resolve, reject) {
    var folderName = config.filesytem_path + '/' + fas.model;
    try {
      var labelName = folderName + '/' + fas.classificationTag;
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName)
        if (!fs.existsSync(labelName)) {
          fs.mkdirSync(labelName);
        }
        resolve(labelName);
      } else {
        if (!fs.existsSync(labelName)) {
          fs.mkdirSync(labelName);
        }
        resolve(labelName);
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

async function writeTweets(fas, text, tweet_id_str) {
  let fileName = fas.folderPath + '/' + tweet_id_str + '.txt'
  fs.writeFileSync(fileName, text, err => {
    if (err) {
      console.error(err)
      return
    }
    //file written successfully
  })
  // upload to GCS
  let destFileName = fas.model + '/' + tweet_id_str + '.txt';
  await storage.bucket(config.training_data_bucket_name).upload(fileName, {
    destination: destFileName,
  }).catch(function (error) {
    console.log('GCS upload error ', error);
  });
  // write to jsonl
  // const jsonl_stream = fs.createWriteStream(fas.folderPath + '/../' + fas.model+'.jsonl', { flags: 'a' });
  // let jsonl_payload = {
  //   "classificationAnnotations": [{
  //     "displayName": fas.classificationTag
  //     }],
  //   "textGcsUri": 'gs://'+config.training_data_bucket_name+'/'+destFileName,
  //   "dataItemResourceLabels": {
  //     "aiplatform.googleapis.com/ml_use": fas.mlUse
  //   }
  // }
  // jsonl_stream.write(JSON.stringify(jsonl_payload) + ',');
  // write to CSV
  let csv_payload = 'gs://'+config.training_data_bucket_name+'/'+destFileName + ',' + fas.classificationTag;
  const csv_stream = fs.createWriteStream(fas.folderPath + '/../' + fas.model+'.csv', { flags: 'a' });
  csv_stream.write(csv_payload + '\n');
}


async function extractFasToGcs(datasetId, tableId) {
  var tableName = config.gcp_projectId + '.' + datasetId + '.' + tableId;
  const sqlQuery = `SELECT id_str, text FROM \`` + tableName + '`';
  console.log('SQL Query', sqlQuery);
  const options = {
    query: sqlQuery,
    // Location must match that of the dataset(s) referenced in the query.
    location: 'US',
  };

  // Run the query
  const [rows] = await bigqueryClient.query(options);
  console.log('Query Results:');
  rows.forEach(function (row, index) {
    const text = row['text'];
    const id_str = row['id_str'];
    var fileName = '/users/prasannas/Downloads/prepData/not_tvshows/' + id_str + '.txt';
    fs.writeFileSync(fileName, text, err => {
      if (err) {
        console.error(err)
        return
      }
      //file written successfully
    })
  });
}

async function uploadTraningData(modelFolderPath, modelName) {
  compressFile(modelFolderPath, modelName).then((destFileName) => {
    console.log('Compressed zip file ', destFileName);
    storage.bucket(config.training_data_bucket_name).upload(config.filesytem_path + '/' + destFileName, {
      destination: destFileName,
    });
    //console.log(`${filePath} uploaded to ${bucketName}`);
  })

}

async function compressFile(modelFolderPath, modelName) {
  var outputFile = config.filesytem_path + '/' + modelName + '.zip';
  console.log('model path ', outputFile)

  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outputFile);

  return new Promise((resolve, reject) => {
    archive
      .directory(modelFolderPath, false)
      .on('error', err => reject(err))
      .pipe(stream)
      ;
    stream.on('close', () => resolve(modelName + '.zip'));
    archive.finalize();
  }).catch(function (error) {
    console.log('Error in compressing file ', error);
  });

}

module.exports = { tweetsToTxt, setupFolders, uploadTraningData };
