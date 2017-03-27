var express = require('express');
var router = express.Router();
var pg = require('pg');

var config = {
  user: 'cs421g38', //env var: PGUSER
  database: 'cs421', //env var: PGDATABASE
  password: 'KevinNam69', //env var: PGPASSWORD
  host: 'comp421.cs.mcgill.ca', // Server hosting the postgres database
  port: 5432, //env var: PGPORT
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
};

var pool = new pg.Pool(config);
var pgclient;

pool.connect(function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  pgclient = client;
  console.log("Successfully connected to " + config.host);
});

pool.on('error', function (err, client) {
  console.error('idle client error', err.message, err.stack)
})

/* GET home page. */
router.get('/', function(req, res, next) {
  query("SELECT * FROM Customer", function(customers) {
    res.render('index', {customers : customers});
  })
});

router.get('/select/:email/orders', function(req, res, next) {
  console.log(req.params.email)
  emailDecoded = req.params.email.replace("-at-", "@");
  console.log(emailDecoded)
  query("SELECT * FROM Orders WHERE email = '" + emailDecoded + "'", function(rows) {
    res.send(rows);
  });
});

router.get('/select/:entity', function(req, res, next) {
  query("SELECT * FROM " + req.params.entity, function(rows) {
    res.send(rows);
  });
});

router.get('/select/orders/:status', function(req, res, next) {
  query("SELECT * FROM Orders WHERE status ='" + req.params.status +"'", function(rows) {
    res.send(rows);
  });
});

router.get('/select/orders/date/:date', function(req, res, next) {
  console.log(req.params.date);
  query("SELECT * FROM Orders WHERE orderid IN (SELECT orderid FROM Places WHERE order_date = '" + req.params.date + "')", function(rows) {
    res.send(rows);
  });
});

router.post('/modify/food_item', function(req, res, next) {

  food_item_discount_select = req.body.food_item_discount_select;
  percent = req.body.percent;

  if (percent > 100) {
    percent = 100;
  }

  if (food_item_discount_select && percent) {
    modifier = 1 - percent / 100;
    query("UPDATE " + food_item_discount_select + " SET price = price * " + modifier, function(rows) {
      console.log(rows);
      res.redirect("/");
    });
  } else {
    res.send("Error. Invalid input. Please put in a valid percent value.");
  }
});

router.post('/create/food_item', function(req, res, next) {
  console.log(req.body)

  foodid = req.body.foodid;
  size = req.body.size;
  price = req.body.price;

  if (isValid(foodid) && isValid(size)) {
    query("SELECT * FROM Food_Item WHERE foodid = '" + foodid + "' AND size = '" + size  + "'", function(data) {
      console.log(data);
      if (foodid && size && price && data.length == 0) {
        if(req.body.type == "sandwich") {
          with_cheese = req.body.with_cheese

          if (!with_cheese) {
            with_cheese = "false";
          }

          query("INSERT INTO Sandwich VALUES (\'" + foodid + "\',\'" + size + "\'," + price + "," + with_cheese + ")", function(rows) {
            console.log(rows);
            res.send('Successfully created a ' + size + ' ' + foodid + 'sandwich!');
          })
        } else if (req.body.type == "drink") {
          with_ice = req.body.with_ice

          if (!with_ice) {
            with_ice = "false";
          }

          query("INSERT INTO Drink VALUES (\'" + foodid + "\',\'" + size + "\'," + price + "," + with_ice + ")", function(rows) {
            console.log(rows);
            res.send('Successfully created a ' + size + ' ' + foodid + 'drink!');
          })
        } else if (req.body.type == "side") {
          query("INSERT INTO Side VALUES (\'" + foodid + "\',\'" + size + "\'," + price  + ")", function(rows) {
            console.log(rows);
            res.send('Successfully created a ' + size + ' ' + foodid + 'side!');
          })
        }
      } else {
        res.send('Error. Invalid input, missing data or food_item already exists. You entered: ' + JSON.stringify(req.body));
      }
    });
  } else {
    res.send('Error. Invalid input. We do not allow special characters. You entered: ' + JSON.stringify(req.body));
  }

})

function isValid(str){
 return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);
}

function query(q, callback) {
  var query = pgclient.query(q);
  var rows = [];

  // Get query results and push to rows
  query.on('row', function(row) {
      rows.push(row);
  });

  // When query is finished, run callback
  query.on('end', function(result) {
      callback(rows);
  });

  query.on('error', function(error) {
      console.log(error);
      callback({error : error});
  });
}

module.exports = router;
