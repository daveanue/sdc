const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;
const db = require('../database/index.js');
const {getReviewForProductID, getReviewMetaData, postReview, lastInsertId, postPhotos, addCharacteristicsReviews, reportReview, incrementHelpful} = require('../database/index.js');
app.use(express.json(), express.urlencoded());

// get reviews endpoint
// params should allow page, count , sort , product_id
app.get('/reviews/:product_id', function(req, res) {
  // query parameters can be retrived from the query object on req obj send to route.
  let productID = Number(req.params.product_id);

  let convertToDate = function(dateToConvert) {
    return new Date(dateToConvert).toISOString();
  };

  getReviewForProductID(productID, (err, result) => {
    if (err) {
      console.log('err has occurred for getReviewForProductID', err);
    } else {
      const data = result;
      const resultsArray = data.map((data) => {
        return {
          review_id: data.reviewID,
          rating: data.rating,
          summary: data.summary,
          recommend: data.recommend,
          response: data.response,
          body: data.body,
          date: convertToDate(data.review_date),
          review_name: data.reviewer_name,
          helpfulness: data.helpfulness,
          photos: [
            {
              id: data.photoID,
              url: data.url
            }
          ]
        };
      });
      const resultData = {
        product: productID,
        page: 0,
        count: 0,
        results: resultsArray
      };
      res.status(200).json(resultData);
    }
  });
});

app.get('/reviews/meta/:product_id', function(req, res) {
  let productID = req.params.product_id;

  getReviewMetaData(productID, (err, result) => {
    if (err) {
      console.error('err has occurred', err);
    } else {
      var calcAllRating = function() {
        const ratingObj = {};
        for (var i = 1; i <= 5; i++) {
          var ratedNum = result.filter(data => data.rating === i);
          if (ratedNum.length > 0) {
            ratingObj[i] = ratedNum.length;
          }
        }
        return ratingObj;
      };

      var recordRecommend = function() {
        const recommendObj = {};
        for (var i = 0; i <= 1; i++) {
          var recordBool = result.filter(data => data.recommend === i);
          recommendObj[i] = recordBool.length;
        }
        return recommendObj;
      };

      const getCharacteristics = function() {
        const trackName = {};
        const characteristicNames = result.forEach((data) => {
          if (trackName[data.name] === undefined) {
            trackName[data.name] = {id: data.characterID, values: []};
            trackName[data.name].values.push(data.value);
          } else {
            trackName[data.name].values.push(data.value);
          }
          // calculate all average value for that particular characterID
        });
        const average = (array) => array.reduce((a, b) => (a + b)) / array.length;
        for (var keys in trackName) {
          trackName[keys].values = (average(trackName[keys].values).toFixed(4));
        }
        return trackName;
      };
      const resultData = {
        product_id: productID,
        ratings: calcAllRating(),
        recommended: recordRecommend(),
        characteristics: getCharacteristics()
      };
      res.status(200).json(resultData);
    }
  });
});

app.post('/reviews', function(req, res) {
  let body = req.body;
  var bodyArray = [];
  var currentTime = new Date();
  var dates = date => new Date(date).getTime();
  // default Value covers helpfulness, reported, review_date,
  const defaultValues = [0, 0, dates(currentTime)];
  for (var keys in body) {
    if (keys !== 'photos' && keys !== 'characteristics' && keys !== 'recommend') {
      bodyArray.push(body[keys]);
    }
    if (keys === 'recommend') {
      if (body[keys] === false) {
        body[keys] = 0;
        bodyArray.push(body[keys]);
      } else {
        body[keys] = 1;
        bodyArray.push(body[keys]);
      }
    }
  }
  bodyArray = bodyArray.concat(defaultValues);
  // console.log(bodyArray);
  postReview(bodyArray, (err, result) => {
    if (err) {
      console.error(err);
    } else {
      return result;
    }
  });
  var lastinsertID = lastInsertId((err, result) => {
    if (err) {
      console.error(err);
    } else {
      // console.log('result for lastinsertID', result);
      return result;
    }
  });

  // lastinsertID = lastinsertID[0][0].s;

  console.log('show lastinsertID here', lastinsertID);
  // console.log('body photos', typeof JSON.parse(body.photos));
  // add each photo, according to last reviewID inserted to review table.

  const photos = JSON.parse(body.photos);
  console.log('photos', Array.isArray(photos));
  photos.forEach((photo) => {
    postPhotos([lastinsertID, photo], (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log(result);
      }
    });
  });

  // add characteristics
  const characterIds = Object.keys(body.characteristics);
  const characterValues = Object.values(body.characteristics);

  for (let i = 0; i < characterIds.length; i++) {
    addCharacteristicsReviews([Number(characterIds[i]), Number(lastInsertId), characterValues[i]], function(err, result) {
      if (err) {
        // res.statusCode(404);
        // res.send(err);
        console.error(err);
      } else {
        // res.statusCode(200);
        // res.send(result);
        console.log(result);
      }
    });
  }
});


app.put('/reviews/:review_id/report', function(req, res) {
  const id = req.params.review_id;
  reportReview(id, function(err, result) {
    if (err) {
      res.statusCode(404);
      res.send(err);
    } else {
      res.statusCode(200);
      res.send(result);
    }
  });
});

app.put('/reviews/:review_id/helpful', function(req, res) {
  const id = req.params.review_id;
  incrementHelpful(id, function(err, result) {
    if (err) {
      res.statusCode(404);
      res.send(err);
    } else {
      res.statusCode(200);
      res.send(result);
    }
  });
});


app.listen(PORT, () => {
  console.log(`Server listening at localhost:${3000}!`);
});
