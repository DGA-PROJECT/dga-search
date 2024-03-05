const dotenv = require("dotenv");
const { Pool } = require("pg");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
dotenv.config();
const port = 3002;

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// db secret
const mongDbSecret = {
  user: process.env.MONGO_USER,
  host: process.env.MONGO_HOST,
  database: process.env.MONGO_DATABASE,
  password: process.env.MONGO_PASSWORD,
  port: process.env.MONGO_PORT,
};

const uri = `mongodb://${mongDbSecret.user}:${mongDbSecret.password}@${mongDbSecret.host}:${mongDbSecret.port}`;
const dbName = mongDbSecret.database;

const pool = new Pool({
  user: process.env.POSTGRE_USER,
  host: process.env.POSTGRE_HOST,
  database: process.env.POSTGRE_DATABASE,
  password: process.env.POSTGRE_PASSWORD,
  port: process.env.POSTGRE_PORT, // PostgreSQL 포트 번호
  max: 20, // Connection Pool의 최대 연결 수
  idleTimeoutMillis: 30000, // 연결이 유휴 상태로 유지되는 시간 (밀리초)
});

const checkEnvURL = () => {
  if (process.env.NODE_ENV == "development") {
    return "";
  } else {
    return "/searches";
  }
};

const createAreaTuple = (selectedArea) => {
  const queryString = `('${selectedArea.join("', '")}')`;
  return queryString;
};

const areaString = (selected) => {
  if (selected.area[0] == "all") {
    return "";
  } else {
    return ` AND area IN ${createAreaTuple(selected.area)}`;
  }
};

const travelTypeString = (selected) => {
  if (selected.travelType == "all") {
    return "";
  } else {
    return ` AND travel_type = '${selected.travelType}'`;
  }
};

const destiTypeString = (selected) => {
  if (selected.destiType == "all") {
    return "";
  } else {
    return ` AND desti_type = '${selected.destiType}'`;
  }
};

const filterString = (selected) => {
  if (selected.filter == "newest") {
    return `ORDER BY post_id DESC`;
  } else if (selected.filter == "like") {
    return `ORDER BY like_count DESC`;
  } else {
    return `ORDER BY revisit_count DESC`;
  }
};

const questStringCheckIdempty = (arr) => {
  if (arr[0]) {
    return `\nWHERE post_id IN (${arr.join(",")})`;
  } else {
    return "\nWHERE post_id IN (-1)";
  }
};

//axios테스트
app.get(checkEnvURL() + "/testget", (req, res, next) => {
  res.json(JSON.stringify("서치 겟 연결됐엉"));
});

app.post(checkEnvURL() + "/postest", (req, res) => {
  console.log(req.body);
  req.body.message = "서치 포스트 성공했어!";
  res.json(req.body);
});

app.post(checkEnvURL() + "/", async (req, res) => {
  const selected = req.body.selected;
  const maxIdx = req.body.maxIdx;
  let client;
  try {
    client = await pool.connect();
    const firstQuery = `
    SELECT post_id
    FROM posts
    WHERE is_banned = false${areaString(selected)}${travelTypeString(
      selected
    )}${destiTypeString(selected)}
    LIMIT ${(maxIdx + 1) * 1000}
    OFFSET ${maxIdx * 1000 + 1};
    `;

    const firstResult = await client.query(firstQuery);
    const firstRows = firstResult.rows;

    console.log(firstRows);
    const firstPostIdsArray = firstRows.map((item) => item.post_id);

    let finalPostIdsArray = firstPostIdsArray[0] ? firstPostIdsArray : [];
    let finalQuery = `
    SELECT post_id, user_id, nickname, title, like_count, desti_name, revisit_count, area, travel_type, desti_type, thumbnail_url
    FROM posts${questStringCheckIdempty(finalPostIdsArray)}
    ${filterString(selected)};
    `;
    let finalData = [];

    if (selected.titleContent || selected.writer) {
      const secondQuery = `
              SELECT post_id, title, content, desti_name, nickname
              FROM posts${questStringCheckIdempty(firstPostIdsArray)}
              `;
      const secondResult = await client.query(secondQuery);
      // 닉네임 식별
      const specificWriter = selected.writer;
      const filteredNicknameData = secondResult.rows.filter((obj) =>
        obj.nickname.includes(specificWriter)
      );

      //   검색어 식별
      const specificString = selected.titleContent; // 특정한 문자열
      const filteredWordData = filteredNicknameData.filter(
        (obj) =>
          obj.content.includes(specificString) ||
          obj.desti_name.includes(specificString) ||
          obj.title.includes(specificString)
      );
      console.log(filteredWordData);
      finalPostIdsArray = filteredWordData.map((obj) => obj.post_id);
      console.log(finalPostIdsArray);
      if (finalPostIdsArray[0]) {
        finalQuery = `
        SELECT post_id, user_id, nickname, title, like_count, desti_name, revisit_count, area, travel_type, desti_type, thumbnail_url
        FROM posts${questStringCheckIdempty(finalPostIdsArray)}
        ${filterString(selected)};
        `;
        finalData = await client.query(finalQuery);
        console.log(finalData.rows);
        res.json({
          message: "word success",
          posts: finalData.rows,
        });
      } else {
        res.json({
          message: "no data success",
          posts: [],
        });
      }
    } else {
      finalData = await client.query(finalQuery);
      res.json({ message: "no word data success", posts: finalData.rows });
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json(JSON.stringify({ message: "db error", posts: [] }));
  } finally {
    if (client) {
      client.release(); // 클라이언트 반환
    }
  }
});

// 애플리케이션이 종료될 때 풀을 명시적으로 종료dd
process.on("SIGINT", () => {
  pool.end().then(() => {
    console.log("Pool has ended");
    process.exit(0);
  });
});

app.get(checkEnvURL() + "/envtest", async (req, res, next) => {
  try {
    if (process.env.POSTGRE_DATABASE !== "mydatabase") {
      res.json(JSON.stringify("database틀림"));
    } else if (process.env.POSTGRE_HOST !== "52.78.60.234") {
      res.json(JSON.stringify("host틀림"));
    } else if (process.env.POSTGRE_USER !== "muzzi") {
      res.json(JSON.stringify("user틀림"));
    } else if (process.env.POSTGRE_PASSWORD !== "test123") {
      res.json(JSON.stringify("비번 틀림"));
    } else if (process.env.POSTGRE_PORT !== "5432") {
      res.json(JSON.stringify("포트 틀림"));
    } else {
      res.json(JSON.stringify("다맞음"));
      console.log("?");
    }
  } catch (err) {
    res.status(500).json(JSON.stringify({ error: err.message }));
  }
});

app.listen(port, () => console.log("Server is running on : " + port));
// console.log(process.env.POSTGRE_USER);
// console.log(process.env.POSTGRE_HOST);
// console.log(process.env.POSTGRE_DATABASE);
// console.log(process.env.POSTGRE_PASSWORD);
// console.log(process.env.POSTGRE_PORT);
