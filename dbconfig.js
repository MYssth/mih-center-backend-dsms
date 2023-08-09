const config = {
    user: process.env.hostUser,
    password: process.env.hostPass,
    server: process.env.prodHost,
    database: process.env.hostDB,
    options: {
        encrypt: false,
        enableArithAbort: false,
    },
    port: 1433
}

module.exports = config;