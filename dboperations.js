require('dotenv').config();
var config = require('./dbconfig');
const sql = require('mssql');
const dateFns = require('date-fns');

async function newDataCheck(year, month, day, shift_id) {
    let pool = await sql.connect(config);
    const result = await pool.request()
        .input("day", sql.VarChar, day)
        .input("month", sql.VarChar, month)
        .input("year", sql.VarChar, year)
        .input("shift_id", sql.TinyInt, shift_id)
        .query("SELECT * FROM dsms_data WHERE day = @day AND month = @month AND year = @year AND shift_id = @shift_id");
    if (result.recordset.length !== 0) {
        console.log("data found id = " + result.recordset[0].id);
        return result.recordset[0].id;
    }
    console.log("data not found");
    return 0;
}

async function getNewEventId() {
    let pool = await sql.connect(config);
    console.log("get new event id");
    const result = await pool.request().query("SELECT TOP (1) id FROM dsms_data ORDER BY id DESC");
    let newId = 1;
    if (result.recordset.length !== 0) {
        newId = parseInt(result.recordset[0].id) + 1;
    }
    console.log("new id = " + newId);
    return newId;

}

async function digestData(data) {
    let pool = await sql.connect(config);
    console.log("get personnel attend list");
    const result = await pool.request().query("SELECT" +
        " dsms_attend_list.data_id" +
        " ,dsms_attend_list.personnel_id" +
        " ,personnel.personnel_firstname" +
        " ,personnel.personnel_lastname" +
        " FROM dsms_attend_list" +
        " LEFT JOIN personnel ON personnel.personnel_id = dsms_attend_list.personnel_id");
    const psnList = result.recordsets[0];
    console.log("push personnel list into data")

    for (let i = 0; i < psnList.length; i += 1) {
        for (let n = 0; n < data.length; n += 1) {
            if (psnList[i].data_id === data[n].id) {
                if (data[n].psn_list !== "" && data[n].psn_list !== null && data[n].psn_list !== undefined) {
                    await Object.assign(data[n], { "psn_list": data[n].psn_list + ", " + psnList[i].personnel_firstname });
                }
                else {
                    await Object.assign(data[n], { "psn_list": psnList[i].personnel_firstname });
                }
                break;
            }
        }
    }

    console.log("make data ready to use");
    let itEndNow = [];

    const now = new Date()
    const inFiveDays = new Date(new Date(now).setDate(now.getDate() + 5))

    for (let i = 0; i < data.length; i += 1) {
        let tempToTime = data[i].to_time === "24" ? "23:59" : data[i].to_time + ":00";
        let tempStartDate = new Date(data[i].year + "-" + data[i].month + "-" + data[i].day);
        let tempEndDate = data[i].is_overnight ? new Date(new Date(tempStartDate).setDate(tempStartDate.getDate() + 1)) : tempStartDate;
        itEndNow.push({
            id: data[i].id,
            shift_id: data[i].shift_id,
            title: data[i].psn_list,
            start: new Date(tempStartDate.getFullYear() + "/" + (parseInt(tempStartDate.getMonth()) + 1) + "/" + tempStartDate.getDate() + " " + data[i].from_time + ":00").toString(),
            end: new Date(tempEndDate.getFullYear() + "/" + (parseInt(tempEndDate.getMonth()) + 1) + "/" + tempEndDate.getDate() + " " + tempToTime).toString(),
            hexColor: data[i].color,
        })
    }

    return itEndNow;
}

const getEventQuery = "SELECT" +
    " dsms_data.id" +
    " ,dsms_data.day" +
    " ,dsms_data.month" +
    " ,dsms_data.year" +
    " ,dsms_data.shift_id" +
    " ,dsms_shift.name" +
    " ,dsms_shift.from_time" +
    " ,dsms_shift.to_time" +
    " ,dsms_shift.is_overnight" +
    " ,dsms_shift.color" +
    " FROM dsms_data" +
    " LEFT JOIN dsms_shift ON dsms_shift.id = dsms_data.shift_id ";

async function getSetting() {
    try {
        console.log("getSetting call try connect to server");
        let pool = await sql.connect(config);
        console.log("connect complete");
        const result = await pool.request().query("SELECT * FROM dsms_setting");
        console.log("getSetting complete");
        console.log("====================");
        return result.recordsets[0];
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function updateSetting(limit_date) {
    try{
        console.log("updateSetting call try connect to server");
        let pool = await sql.connect(config);
        console.log("connect complete");
        await pool.request().input("limit_date", sql.VarChar, limit_date).query("UPDATE ");
    }
    catch(error){
        console.log(error);
        return { "status": "error", "message": error.message };
    }
}

async function getEvent() {
    try {
        console.log("getEvent call try connect to server");
        let pool = await sql.connect(config);
        console.log("connect complete");
        const data = await pool.request().query(
            getEventQuery +
            "Order BY shift_id");
        const result = await digestData(data.recordsets[0]);

        console.log("getEvent complete");
        console.log("====================");
        return result;
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function getBookData(id, month) {
    try {
        console.log("getBookData call try connect to server id = " + id + " month = " + month);
        let pool = await sql.connect(config);
        console.log("connect complete");
        const data = await pool.request().input("month", sql.VarChar, month)
            .input("id", sql.VarChar, id).query(
                getEventQuery +
                " LEFT JOIN dsms_attend_list ON dsms_attend_list.data_id = dsms_data.id" +
                " WHERE dsms_data.month = @month AND dsms_attend_list.personnel_id = @id" +
                " ORDER BY shift_id");
        // const result = await digestData(data.recordsets[0]);

        console.log("getBookData complete");
        console.log("====================");
        return data.recordsets[0];
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function addEvent(eventData) {
    try {
        console.log("setEvent call try connect to server id = " + eventData.personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");

        for (let i = 0; i < eventData.selectedDate.length; i += 1) {
            const date = eventData.selectedDate[i].split("/");
            const tMonth = parseInt(date[1]) + 1;
            let data_id = await newDataCheck(date[0], tMonth.toString(), date[2], eventData.shift_id);
            if (data_id === 0) {
                console.log("new data case");
                data_id = await getNewEventId();
                await pool.request()
                    .input("id", sql.Int, data_id)
                    .input("day", sql.VarChar, date[2])
                    .input("month", sql.VarChar, tMonth.toString())
                    .input("year", sql.VarChar, date[0])
                    .input("shift_id", sql.TinyInt, eventData.shift_id)
                    .query("INSERT INTO dsms_data (id, day, month, year, shift_id) VALUES (@id, @day, @month, @year, @shift_id)");
                console.log("insert event data complete");
                await pool.request()
                    .input("data_id", sql.Int, data_id)
                    .input("personnel_id", sql.VarChar, eventData.personnel_id)
                    .query("INSERT INTO dsms_attend_list (data_id, personnel_id) VALUES (@data_id, @personnel_id)");
            }

        }
        console.log("insert attend list complete");
        console.log("addEvent complete");
        console.log("====================");
        return { "status": "ok" };
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function editEvent(eventData) {
    try {
        console.log("editEvent call try connect to server");
        let pool = await sql.connect(config);
        console.log("connect complete");
        let data_id = await newDataCheck(eventData);
        if (data_id === 0) {
            console.log("add new data");
            data_id = await getNewEventId();
            await pool.request()
                .input("id", sql.Int, data_id)
                .input("day", sql.VarChar, eventData.day)
                .input("month", sql.VarChar, eventData.month)
                .input("year", sql.VarChar, eventData.year)
                .input("shift_id", sql.TinyInt, eventData.shift_id)
                .query("INSERT INTO dsms_data (id, day, month, year, shift_id) VALUES (@id, @day, @month, @year, @shift_id)");
        }
        console.log("change personnel_id = " + eventData.personnel_id + " to data id = " + data_id);
        await pool.request()
            .input("old_id", sql.Int, eventData.id)
            .input("new_id", sql.Int, data_id)
            .input("personnel_id", sql.VarChar, eventData.personnel_id)
            .query("UPDATE dsms_attend_list SET" +
                " data_id = @new_id," +
                " WHERE data_id = @old_id AND personnel_id = @personnel_id");
        console.log("editEvent complete");
        console.log("====================");
        return { "status": "ok" };

    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function deleteEvent(id, personnel_id) {
    try {
        console.log("deleteEvent call try connect to server id = " + id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        await pool.request()
            .input("id", sql.Int, id)
            .input("personnel_id", sql.VarChar, personnel_id)
            .query("DELETE FROM dsms_attend_list WHERE id = @id AND personnel_id = @personnel_id");
        console.log("delete data in attend list complete");
        const result = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT * FROM dsms_attend_list WHERE id = @id");
        if (result.recordset.length === 0) {
            console.log("no attend left in list, delete event data");
            await pool.request()
                .input("id", sql.Int, id)
                .query("DELETE FROM dsms_data WHERE id = @id");
        }
        console.log("deleteEvent complete");
        console.log("====================");
        return { "status": "ok" };
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function getShift() {
    try {
        console.log("getShift call try connect to server");
        let pool = await sql.connect(config);
        console.log("connect complete");
        const result = await pool.request().query("SELECT * FROM dsms_shift");
        console.log("getShift complete");
        console.log("====================");
        return result.recordsets;
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

module.exports = {
    getSetting: getSetting,
    getEvent: getEvent,
    getBookData: getBookData,
    addEvent: addEvent,
    editEvent: editEvent,
    deleteEvent: deleteEvent,
    getShift: getShift,
}