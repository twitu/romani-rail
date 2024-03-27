const fs = require('fs');
const initSqlJs = require('sql.js');
const filebuffer = fs.readFileSync('train_schedule.db');

initSqlJs().then(function (SQL) {
    const db = new SQL.Database(filebuffer);
    const sql_query = fs.readFileSync('./railway.session.sql').toString()
    const query_result = db.exec(sql_query);
    console.log(query_result[0]['columns'])
    console.table(query_result[0]['values'])
});
