require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
var config = require("./dbconfig");
const sql = require("mssql");
const dateFns = require("date-fns");

async function newDataCheck(year, month, day, shift_id) {
  let pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("day", sql.VarChar, day)
    .input("month", sql.VarChar, month)
    .input("year", sql.VarChar, year)
    .input("shift_id", sql.TinyInt, shift_id)
    .query(
      "SELECT * FROM dsms_data WHERE day = @day AND month = @month AND year = @year AND shift_id = @shift_id"
    );
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
  const result = await pool
    .request()
    .query("SELECT TOP (1) id FROM dsms_data ORDER BY id DESC");
  let newId = 1;
  if (result.recordset.length !== 0) {
    newId = parseInt(result.recordset[0].id) + 1;
  }
  console.log("new id = " + newId);
  return newId;
}

async function pushPersonnel(data) {
  let pool = await sql.connect(config);
  console.log("get personnel attend list");
  const himsPsn = await getHimspsn();
  let result = await pool
    .request()
    .query(
      "SELECT" +
        " dsms_attend_list.data_id" +
        " ,dsms_attend_list.psn_id" +
        " FROM dsms_attend_list"
    );
  result = result.recordsets[0];
  let psnList = [];
  for (let i = 0; i < result.length; i += 1) {
    for (let n = 0; n < himsPsn.length; n += 1) {
      if (result[i].psn_id === himsPsn[n].psn_id) {
        await psnList.push({
          data_id: result[i].data_id,
          personnel_id: result[i].psn_id,
          personnel_firstname: himsPsn[n].fname,
          personnel_lastname: himsPsn[n].lname,
        });
        break;
      }
    }
  }

  console.log("push personnel list into data");

  for (let i = 0; i < psnList.length; i += 1) {
    for (let n = 0; n < data.length; n += 1) {
      if (psnList[i].data_id === data[n].id) {
        if (
          data[n].psn_list !== "" &&
          data[n].psn_list !== null &&
          data[n].psn_list !== undefined
        ) {
          await Object.assign(data[n], {
            psn_list: data[n].psn_list + ", " + psnList[i].personnel_firstname,
          });
        } else {
          await Object.assign(data[n], {
            psn_list: psnList[i].personnel_firstname,
          });
        }
        break;
      }
    }
  }

  console.log("make data ready to use");
  let itEndNow = [];

  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < data.length; i += 1) {
    let tempToTime =
      data[i].to_time === "24" ||
      (data[i].from_time === "17" && data[i].to_time === "8")
        ? "23:59"
        : data[i].to_time + ":00";
    let tempFromTime =
      data[i].from_time === "0" ? "00:00" : data[i].from_time + ":00";
    let tempStartDate = new Date(
      data[i].year + "-" + data[i].month + "-" + data[i].day
    );
    let tempEndDate = tempStartDate;

    itEndNow.push({
      id: data[i].id,
      shift_id: data[i].shift_id,
      title: data[i].psn_list,
      start: `${weekday[tempStartDate.getDay()]} ${getMonthShortName(
        parseInt(tempStartDate.getMonth()) + 1
      )} ${tempStartDate.getDate()} ${tempStartDate.getFullYear()} ${tempFromTime}:00 GMT+0700 (Indochina Time)`,
      end: `${weekday[tempEndDate.getDay()]} ${getMonthShortName(
        parseInt(tempEndDate.getMonth()) + 1
      )} ${tempEndDate.getDate()} ${tempEndDate.getFullYear()} ${tempToTime}:00 GMT+0700 (Indochina Time)`,
      hexColor: data[i].color,
    });
  }

  return itEndNow;
}

function getMonthShortName(monthNo) {
  const date = new Date();
  date.setMonth(monthNo - 1);

  return date.toLocaleString("en-US", { month: "short" });
}

async function getHimspsn() {
  return await fetch(
    `http://${process.env.backendHost}:${process.env.himsPort}/api/himspsn/getallpsndata`
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("getAllPSNData complete");
      return data;
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        console.log("cancelled");
      } else {
        console.error("Error:", error);
      }
    });
}

const getEventQuery =
  "SELECT" +
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
    return result.recordset[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function updateSetting(settingData) {
  try {
    console.log("updateSetting call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    await pool
      .request()
      .input("limit_date", sql.VarChar, settingData.limit_date)
      .query("UPDATE dsms_setting SET limit_date = @limit_date");
    console.log("updateSetting complete");
    console.log("====================");
    return { status: "ok" };
  } catch (error) {
    console.log(error);
    return { status: "error", message: error.message };
  }
}

async function getEvent() {
  try {
    console.log("getEvent call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    const data = await pool
      .request()
      .query(getEventQuery + " Order BY shift_id");
    const result = await pushPersonnel(data.recordsets[0]);

    console.log("getEvent complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getEventByPSNId(psn_id) {
  try {
    console.log("getEventByPSNId call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    const data = await pool
      .request()
      .input("psn_id", sql.VarChar, psn_id)
      .query(
        getEventQuery +
          " LEFT JOIN dsms_attend_list ON dsms_attend_list.data_id = dsms_data.id" +
          " WHERE dsms_attend_list.psn_id = @psn_id" +
          " Order BY shift_id"
      );
    const result = await pushPersonnel(data.recordsets[0]);

    console.log("getEventByPSNId complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getManageBookData(psn_id) {
  try {
    console.log("getManageBookData call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    const data = await pool
      .request()
      .input("psn_id", sql.VarChar, psn_id)
      .query(
        getEventQuery +
          " LEFT JOIN dsms_attend_list ON dsms_attend_list.data_id = dsms_data.id" +
          " WHERE dsms_attend_list.psn_id = @psn_id" +
          " ORDER BY shift_id"
      );

    console.log("getManageBookData complete");
    console.log("====================");
    return data.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getBookData(psn_id, month, year) {
  try {
    console.log(
      "getBookData call try connect to server id = " +
        psn_id +
        " month = " +
        month +
        " year = " +
        year
    );
    let pool = await sql.connect(config);
    console.log("connect complete");
    const data = await pool
      .request()
      .input("month", sql.VarChar, month)
      .input("year", sql.VarChar, year)
      .input("psn_id", sql.VarChar, psn_id)
      .query(
        getEventQuery +
          " LEFT JOIN dsms_attend_list ON dsms_attend_list.data_id = dsms_data.id" +
          " WHERE dsms_data.month >= @month AND dsms_data.year >= @year AND dsms_attend_list.psn_id = @psn_id" +
          " ORDER BY shift_id"
      );

    console.log("getBookData complete");
    console.log("====================");
    return data.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function addEvent(eventData) {
  try {
    console.log(
      "addEvent call try connect to server id = " + eventData.personnel_id
    );
    let pool = await sql.connect(config);
    console.log("connect complete");

    for (let i = 0; i < eventData.selectedDate.length; i += 1) {
      const date = eventData.selectedDate[i].split("/");
      const tMonth = parseInt(date[1]) + 1;
      let data_id = await newDataCheck(
        date[0],
        tMonth.toString(),
        date[2],
        eventData.shift_id
      );
      if (data_id === 0) {
        console.log("new data case");
        data_id = await getNewEventId();
        await pool
          .request()
          .input("id", sql.Int, data_id)
          .input("day", sql.VarChar, date[2])
          .input("month", sql.VarChar, tMonth.toString())
          .input("year", sql.VarChar, date[0])
          .input("shift_id", sql.TinyInt, eventData.shift_id)
          .query(
            "INSERT INTO dsms_data (id, day, month, year, shift_id) VALUES (@id, @day, @month, @year, @shift_id)"
          );
        console.log("insert event data complete");
      }
      await pool
        .request()
        .input("data_id", sql.Int, data_id)
        .input("psn_id", sql.VarChar, eventData.personnel_id)
        .query(
          "INSERT INTO dsms_attend_list (data_id, psn_id) VALUES (@data_id, @psn_id)"
        );
    }
    console.log("insert attend list complete");
    console.log("addEvent complete");
    console.log("====================");
    return { status: "ok" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
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
      await pool
        .request()
        .input("id", sql.Int, data_id)
        .input("day", sql.VarChar, eventData.day)
        .input("month", sql.VarChar, eventData.month)
        .input("year", sql.VarChar, eventData.year)
        .input("shift_id", sql.TinyInt, eventData.shift_id)
        .query(
          "INSERT INTO dsms_data (id, day, month, year, shift_id) VALUES (@id, @day, @month, @year, @shift_id)"
        );
    }
    console.log(
      "change personnel_id = " +
        eventData.personnel_id +
        " to data id = " +
        data_id
    );
    await pool
      .request()
      .input("old_id", sql.Int, eventData.id)
      .input("new_id", sql.Int, data_id)
      .input("psn_id", sql.VarChar, eventData.personnel_id)
      .query(
        "UPDATE dsms_attend_list SET" +
          " data_id = @new_id," +
          " WHERE data_id = @old_id AND psn_id = @psn_id"
      );
    console.log("editEvent complete");
    console.log("====================");
    return { status: "ok" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function deleteEvent(data_id, psn_id) {
  try {
    console.log("deleteEvent call try connect to server id = " + data_id);
    let pool = await sql.connect(config);
    console.log("connect complete");
    await pool
      .request()
      .input("data_id", sql.Int, data_id)
      .input("psn_id", sql.VarChar, psn_id)
      .query(
        "DELETE FROM dsms_attend_list WHERE data_id = @data_id AND psn_id = @psn_id"
      );
    console.log("delete data in attend list complete");
    const result = await pool
      .request()
      .input("data_id", sql.Int, data_id)
      .query("SELECT * FROM dsms_attend_list WHERE data_id = @data_id");
    if (result.recordset.length === 0) {
      console.log("no attend left in list, delete event data");
      await pool
        .request()
        .input("id", sql.Int, data_id)
        .query("DELETE FROM dsms_data WHERE id = @id");
    }
    console.log("deleteEvent complete");
    console.log("====================");
    return { status: "ok" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
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
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getShiftById(id) {
  try {
    console.log("getShiftById call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    const result = await pool
      .request()
      .input("id", sql.VarChar, id)
      .query("SELECT * FROM dsms_shift WHERE id = @id");
    console.log("getShiftById complete");
    console.log("====================");
    return result.recordset[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getOperator() {
  try {
    console.log("getOperator call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    const himsPsn = await getHimspsn();
    let result = await pool
      .request()
      .query(
        "SELECT psn.id, psn_lv_list.lv_id " +
          "FROM psn INNER JOIN psn_lv_list ON psn_lv_list.psn_id = psn.id " +
          "WHERE psn_lv_list.lv_id = 'DSMS_ADMIN' OR psn_lv_list.lv_id = 'DSMS_USER'"
      );
    result = result.recordsets[0];
    let tResult = [];
    for (let i = 0; i < result.length; i += 1) {
      for (let n = 0; n < himsPsn.length; n += 1) {
        if (result[i].id === himsPsn[n].psn_id) {
          await tResult.push({
            personnel_id: result[i].id,
            personnel_firstname: himsPsn[n].fname,
            personnel_lastname: himsPsn[n].lname,
            level_id: result[i].lv_id,
          });
          break;
        }
      }
    }
    console.log("getOperator complete");
    console.log("====================");
    return tResult;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getPSNEventList(data_id) {
  try {
    console.log("getPSNEventList call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    const himsPsn = await getHimspsn();
    let result = await pool
      .request()
      .input("data_id", sql.VarChar, data_id)
      .query(
        "SELECT " +
          " dsms_attend_list.psn_id" +
          " FROM dsms_attend_list" +
          " INNER JOIN psn ON psn.id = dsms_attend_list.psn_id" +
          " WHERE dsms_attend_list.data_id = @data_id"
      );
    result = result.recordsets[0];
    let tResult = [];
    for (let i = 0; i < result.length; i += 1) {
      for (let n = 0; n < himsPsn.length; n += 1) {
        if (result[i].id === himsPsn[n].psn_id) {
          await tResult.push({
            personnel_id: result[i].id,
            personnel_firstname: himsPsn[n].fname,
            personnel_lastname: himsPsn[n].lname,
          });
          break;
        }
      }
    }
    console.log("getPSNEventList complete");
    console.log("====================");
    return tResult;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

module.exports = {
  getSetting: getSetting,
  updateSetting: updateSetting,
  getEvent: getEvent,
  getEventByPSNId: getEventByPSNId,
  getManageBookData: getManageBookData,
  getBookData: getBookData,
  addEvent: addEvent,
  editEvent: editEvent,
  deleteEvent: deleteEvent,
  getShift: getShift,
  getShiftById: getShiftById,
  getOperator: getOperator,
  getPSNEventList: getPSNEventList,
};
