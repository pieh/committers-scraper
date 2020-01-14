const glob = require("glob");
const fs = require("fs");

const Octokit = require(`@octokit/rest`).plugin(
  require("@octokit/plugin-throttling")
);

require("dotenv").config();

const client = Octokit({
  auth: `token ${process.env.GITHUB_TOKEN}`,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      console.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );

      if (options.request.retryCount === 0) {
        // only retries once
        console.log(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onAbuseLimit: (retryAfter, options) => {
      // does not retry, only logs a warning
      console.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
    }
  }
});

const pkgs = glob.sync("/Users/misiek/dev/gatsby/packages/*");

const csv = {};

const promises = pkgs.map(package => {
  const filepath = package.replace("/Users/misiek/dev/gatsby/", "");

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

  const listCommitsRequestOptions = client.repos.listCommits.endpoint.merge({
    owner: `gatsbyjs`,
    repo: `gatsby`,
    per_page: 100,
    path: filepath
  });

  return client.paginate(listCommitsRequestOptions).then(commits => {
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
