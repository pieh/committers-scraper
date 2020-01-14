const fetch = require("node-fetch");
const glob = require("glob");
const fs = require("fs");
const githubAPI = "https://api.github.com";
const commitsEndpoint = "/repos/gatsbyjs/gatsby/commits";
const commitsURL = githubAPI + commitsEndpoint;
const pkgs = glob.sync("../packages/*");

const csv = {};

const promises = pkgs.map(package => {
  const filepath = package.replace("../", "");
  csv[filepath] = [];
  const blacklistAuthors = [
    "ChristopherBiscard",
    "LekoArts",
    "DSchau",
    "davidbailey00",
    "pvdz",
    "Madalyn Parker",
    "madalynrose",
    "KyleAMathews",
    "vladar",
    "pieh",
    "TylerBarnes",
    "freiksenet",
    "wardpeet",
    "m-allanson",
    "blainekasten",
    "renovate[bot]",
    "sidharthachatterjee"
  ];
  const foundAuthors = [];

  return fetch(commitsURL + "?path=" + filepath, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  })
    .then(response => response.json())
    .then(commits => {
      if (
        commits.message ===
        "You have triggered an abuse detection mechanism. Please wait a few minutes before you try again."
      ) {
        throw new Error("Need to retry");
      }
      commits.forEach(commit => {
        const author = commit.author || commit.commit.author;
        const authorName = author ? author.login || author.name : "unnamed";
        if (
          (blacklistAuthors.includes(authorName) ||
            foundAuthors.includes(authorName)) === false
        ) {
          foundAuthors.push(authorName);
        }
      });

      csv[filepath] = [foundAuthors.length, foundAuthors.join(" ")];
    })
    .catch(e => {
      console.log(`For repo: ${filepath}`);
      console.error("Failure");
      console.error(e);
    });
});

Promise.all(promises).then(() => {
  let text = "";
  Object.entries(csv).forEach(([title, values]) => {
    text += `${title}, ${values.join(", ")}\n`;
  });
  console.log(text);

  fs.writeFileSync("./data.csv", text);
});
