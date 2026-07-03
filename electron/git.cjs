const fs = require("fs");
const git = require("isomorphic-git");

async function gitStatus(projectPath) {
  const isRepo = fs.existsSync(require("path").join(projectPath, ".git"));
  if (!isRepo) {
    return { isRepo: false, clean: true, entries: [] };
  }

  const matrix = await git.statusMatrix({ fs, dir: projectPath });
  const entries = [];

  for (const [filepath, head, workdir, stage] of matrix) {
    if (head === workdir && workdir === stage && workdir === 1) continue;
    let status = "modified";
    if (head === 0 && workdir === 2) status = "added";
    else if (head === 1 && workdir === 0) status = "deleted";
    else if (head === 0 && workdir === 2 && stage === 0) status = "untracked";
    entries.push({ path: filepath, status });
  }

  let branch;
  try {
    branch = await git.currentBranch({ fs, dir: projectPath });
  } catch {
    branch = undefined;
  }

  return {
    isRepo: true,
    branch: branch || undefined,
    clean: entries.length === 0,
    entries,
  };
}

async function gitInit(projectPath) {
  await git.init({ fs, dir: projectPath, defaultBranch: "main" });
  const gitignorePath = require("path").join(projectPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    const template = [
      "# Optional editor metadata — commit if your team shares UI defaults",
      ".openbook-project.json",
      "",
      "# OS",
      ".DS_Store",
      "",
    ].join("\n");
    await fs.promises.writeFile(gitignorePath, template, "utf8");
  }
}

async function gitCommit(projectPath, message) {
  await git.add({ fs, dir: projectPath, filepath: "." });
  const oid = await git.commit({
    fs,
    dir: projectPath,
    message,
    author: { name: "OpenBook Author", email: "author@openbook.local" },
  });
  return { oid };
}

module.exports = { gitStatus, gitInit, gitCommit };
