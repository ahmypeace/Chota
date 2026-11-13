"""Build the single-file app: python3 build.py  ->  index.html"""
from pathlib import Path

src = Path(__file__).parent / "src"
lib = (src / "lib.js").read_text().replace(
    "if (typeof module !== 'undefined') module.exports = { writeSav, kAlphaNominal };", "")
html = (src / "shell.html").read_text().replace("/*LIB*/", lib).replace("/*MAIN*/", (src / "main.js").read_text())
(Path(__file__).parent / "index.html").write_text(html)
print("index.html written")
