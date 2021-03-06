const express =  require('express');
const router = express();
const validUrl = require('valid-url');
const shortid = require('shortid');
const Url = require('../models/Url');
var ejs = require('ejs');

// set up body-parser
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json({type: 'application/json'}));


// Home page
router.get('/', async(req,res) =>{
    return res.render("../views/home");
});

// Get total number of clicks and number of urls shortened
router.get('/clicks', async(req, res) => {

    let sum = 0, numberOfUrl;

    await Url.find({}, (err, url) => {
        if(err)
        {
            console.log(err);
            return;
        }

        url.forEach((u) => {
            sum += u.clicks;
        })
    })

    
    await Url.countDocuments({}, (err, count) => {
        if(err)
        console.log(err);

        else
        {
            numberOfUrl = count;
        }
    })
    
    res.send(`Total URLs shortened: ${numberOfUrl}  \n Total number of clicks : ${sum}`);
})

// Creating a new short url
router.post('/shorten', async (req, res) => {
    
    console.log(req.body);
    const {longurl, findbase} = req.body;

    const baseurl = findbase;

    // checking validity of base url
    if(!validUrl.isUri(baseurl))
    {
        return res.send("Invalid base url");
    }

    // checking validity of long url
    if(!validUrl.isUri(longurl))
    {
        return res.send("Invalid long url");
    }

    // Check if the long url already exists in the database
    const oldurl = await Url.findOne({'longurl': longurl});

    if(oldurl)
    {

            return res.render('../views/url', {
                'url' : oldurl,
                'message' : ""
            });
    }

    else
    {

    // Generate unique short id
    const code = shortid.generate();

    // Short URL
    const shorturl = baseurl + code;

    try{

        const newUrl = new Url({
            longurl: longurl,
            code: code,
            shorturl: shorturl,
            date: new Date()       
        });
        
        
        const newurl2 = await newUrl.save();
        
       
     return res.render('../views/url', {
          'url' : newurl2,
          'message' : ""
    });    
    }catch(err)
    {
        return res.send(err);
    }

    }
});
  
// Adding custom code in url
router.post('/custom/:code', async(req,res) => {

    const {custom, findbase} = req.body;

    // check if custom code already exists
    const oldcustom = await Url.findOne({'code': custom})
    if(oldcustom)
    {
        return res.render('../views/url', {
            'url': oldcustom,
            'message' : "Sorry, this code is already in use, please enter a new one"
    });  
    }

    else
    {
        const url = await Url.findOne({'code': req.params.code});

        const baseurl = 'http://' + findbase + '/';
        const urln = baseurl + custom;
        
        var newvalues = { $set: {code: custom, shorturl: urln } };
   
        if(url)
        {
            Url.findOneAndUpdate({'code': req.params.code}, newvalues, async(err, data) => {
                if(err)
                return res.send("Error");
            else    
            {
                const url2 = await Url.findOne({'code': custom});
                return res.render('../views/url', {
                    'url' : url2,
                    'message' : ""
            });  
            }
           
    
    });
        }
        else
        {
            return res.send("Invalid url code");
        }
    
    }
});

// Get all the short urls
router.get('/archive', async(req,res)=>{
    const urls  = await Url.find().sort({ date: -1 });

    return res.render('../views/archive', {
       'urls' : urls
    });
});

// List urls for updation
router.get('/update/url', async(req,res)=>{
    const urls  = await Url.find().sort({ date: -1 });

    return res.render('../views/updateUrl', {
       'urls' : urls
    });
});


// Speicfic Url updation form
router.get('/update/url/:id', async(req, res) => {
    await Url.findById(req.params.id, (err, url) => {
        if(err)
        console.log(err);

        
    return res.render('../views/updateOneUrl', {
        'url' : url
     });
    });

})


// Update a Url: longUrl and Code
router.post('/edit/:id', async(req, res) => {
    console.log(req.body);

    // Return is new longurl is not valid
    if(!validUrl.isUri(req.body.longurl))
    {
        return res.json({
          message:  "Invalid long url"
        });
    }

    // New values for updation
    const newValues = {
        longurl: req.body.longurl,
        code: req.body.code,
        shorturl: 'http://' + req.body.findbase + '/' + req.body.code
    }


        // check if custom code already exists
        const oldcustom = await Url.findOne({'code': req.body.code, _id: { $nin: [req.params.id] }})
        if(oldcustom)
        {
            return res.json({
                'message' : "Sorry, this code is short code is aleready in use, please enter a new one"
            });
                
        }
    

    const url = await Url.findByIdAndUpdate(req.params.id, newValues, {new: true}, (err, u) => {
        if(err)
        console.log(err);

        console.log("object");
    });

    return res.render('../views/updateOneUrl', {
        'url' : url
     });

})

// List urls for deletion
router.get('/delete/url', async(req,res)=>{
    const urls  = await Url.find().sort({ date: -1 });

    return res.render('../views/deleteUrl', {
       'urls' : urls
    });
});

// Delete a url by id (the method is get to make request from frontend)
router.get('/delete/url/:id', async(req, res) => {
    await Url.findByIdAndDelete(req.params.id, (err, url) => {
        if(err)
        console.log(err);
    });

    const urls  = await Url.find().sort({ date: -1 });

    return res.render('../views/deleteUrl', {
       'urls' : urls
    });
})

// About page
router.get('/about', async(req,res) =>{    
    return res.render("../views/about");
});

// Redirecting to the original URL
router.get('/:code', async(req,res) => {    
    
    const url = await Url.findOne({'code': req.params.code});

    if(url)
    {
        // checking validity of the url
    if(!validUrl.isUri(url.shorturl))
    {

        return res.send("Invalid short url");
    }
    var newvalues = { $set: {clicks: url.clicks+1} };
   
        Url.findOneAndUpdate({'code': req.params.code}, newvalues, async(err, data) => {
                if(err)
                return res.send("Error");
        });
        
        res.redirect(url.longurl);
    }

    else
    {
        return res.render('../views/errorpage');
    }
});


module.exports = router;