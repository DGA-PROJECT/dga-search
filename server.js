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
    return "/search";
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

app.post(checkEnvURL() + "/postest", (req, res) => {
  console.log(req.body);
  req.body.message = "서치 포스트 성공했어!";
  res.json(req.body);
});

app.post(checkEnvURL() + "/", (req, res) => {
  console.log(req.body);
  req.body.message = "서치 통신완료 성공했어!";
  res.json(req.body);
});

// 애플리케이션이 종료될 때 풀을 명시적으로 종료
process.on("SIGINT", () => {
  pool.end().then(() => {
    console.log("Pool has ended");
    process.exit(0);
  });
});

app.listen(port, () => console.log("Server is running on : " + port));
