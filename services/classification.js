const config = require('../config.js');
const {PredictionServiceClient} = require('@google-cloud/automl').v1;

const client = new PredictionServiceClient();

async function predict(text) {
    // Construct request
    const request = {
      name: client.modelPath(config.gcp_projectId, config.gcp_project_location, config.cxm_modelId ),
      payload: {
        textSnippet: {
          content: text,
          mimeType: 'text/plain', // Types: 'test/plain', 'text/html'
        },
      },
    };
  
    const [response] = await client.predict(request);
  
    for (const annotationPayload of response.payload) {
      console.log(`Predicted class name: ${annotationPayload.displayName}`);
      console.log(
        `Predicted class score: ${annotationPayload.classification.score}`
      );
    }
    return response.payload;
  }

module.exports = { predict };