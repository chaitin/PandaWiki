const fs = require("fs");
const path = require("path");

async function downloadFile(url) {
  const iconPath = path.resolve(__dirname, "../src/assets/fonts/iconfont.js");
  const iconDir = path.dirname(iconPath);

  // 检查目录是否存在，不存在则创建
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
    console.log(`目录 ${iconDir} 已创建`);
  }

  const response = await fetch(`https:${url}`, {
    method: "GET",
    // responseType: "stream", // fetch 不支持此参数
  }).then((res) => res.text());
  fs.writeFileSync(iconPath, response);
  console.log("Download Icon Success");
}
let argument = process.argv.splice(2);
downloadFile(argument[0]);

