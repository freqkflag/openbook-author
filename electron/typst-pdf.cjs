const fs = require("fs").promises;
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

/** WASM Typst PDF pilot — invokes typst CLI when available (Electron) */
async function compileTypstPdf({ source, defaultName }) {
  const typstBin = process.env.TYPST_BIN || "typst";
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openbook-typst-"));
  const typPath = path.join(tempDir, "book.typ");
  const pdfPath = path.join(tempDir, "output.pdf");

  await fs.writeFile(typPath, source, "utf8");

  await new Promise((resolve, reject) => {
    const child = spawn(typstBin, ["compile", typPath, pdfPath], { stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr || `typst exited with code ${code}`));
    });
  });

  const pdf = await fs.readFile(pdfPath);
  return { pdf: pdf.buffer, suggestedName: defaultName || "book.pdf", tempDir };
}

module.exports = { compileTypstPdf };
