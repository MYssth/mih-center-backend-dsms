// var host = 'localhost';
var host = '192.168.101.2';

if (process.env.NODE_ENV === 'production') {
    host = process.env.prodHost;
}

const config = {
    user: process.env.hostUser,
    password: process.env.hostPass,
    server: host,
    database: process.env.hostDB,
    options: {
        encrypt: false,
        enableArithAbort: false,
    },
    port: 1433
}



module.exports = config;