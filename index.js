const express = require("express");
const cookie = require("cookie");
require("dotenv").config();
const crypto = require("crypto");
const request = require("request-promise");
const querystring = require("querystring");
const nonce = require("nonce")();


const app = express();

//route for dashboard
app.get('/dashboard', async (req, res) => {
    try {
        res.status(200).json({
            message: "welcome node app!"
        })
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
});

//get shopify route
app.get('/shopify', (req, res) => {
    //shopname
    const shopName = req.query.shop;
    if (shopName) {
        const shopState = nonce();
        //callback redirect
        const redirectURL = process.env.TUNNEL + '/shopify/callback';
        //install URL
        const shopifyURL = 'https://' + shopName +
            '/admin/oauth/authorize?client_id=' + process.env.SHOPIFY_API +
            '&scope=' + process.env.SCOPES +
            '&state=' + shopState +
            '&redirect_uri=' + redirectURL;
        res.cookie('state', shopState);
        res.redirect(shopifyURL);
    } else {
        return res.status(400).send('Missing "Shop Name" parameter!!');
    }
});

//shopify callback URL
app.get('/shopify/callback',(req,res)=>{
    const { shop: shop, hmac, code, shopState } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
    
    if (shop && hmac && code) {
        const queryMap = Object.assign({}, req.query);
        delete queryMap['signature'];
        delete queryMap['hmac'];

        const message = querystring.stringify(queryMap);
        const providedHmac = Buffer.from(hmac, 'utf-8');
        const generatedHash = Buffer.from(crypto.createHmac('sha256', process.env.SHOPIFY_SECRET).update(message).digest('hex'), 'utf-8');

        let hashEquals = false;

        try {
            hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
        } catch (e) {
            hashEquals = false;
        }

        if (!hashEquals) {
            return res.status(400).send('HMAC failed');
        }

        const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
        const accessTokenPayload = {
            client_id: process.env.SHOPIFY_API,
            client_secret: process.env.SHOPIFY_SECRET,
            code,
        };

        request.post(accessTokenRequestUrl, { json: accessTokenPayload })
            .then((accessTokenResponse) => {
                const accessToken = accessTokenResponse.access_token;
                const shopRequestURL = 'https://' + shop + '/admin/api/2020-04/shop.json';
                conrequire("dotenv").config();  })
                    .catch((error) => {
                        res.status(error.statusCode).send(error.error.error_description);
                    });
            })
            .catch((error) => {
                res.status(error.statusCode).send(error.error.error_description);
            });

    } else {
        res.status(400).send('Required parameters missing');
    }
})

app.listen(5000, () => console.log('listening on port 5000!'));
 